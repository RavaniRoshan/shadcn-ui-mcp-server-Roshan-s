import axios, { AxiosInstance } from 'axios';
import { Logger } from '../utils/logger.js';

export interface Component {
  name: string;
  type: 'component' | 'block' | 'template';
  description?: string;
  dependencies?: string[];
  files?: Array<{
    path: string;
    content: string;
  }>;
  meta?: Record<string, any>;
}

export interface Registry {
  name: string;
  url: string;
  headers?: Record<string, string>;
}

export class RegistryClient {
  private logger: Logger;
  private httpClient: AxiosInstance;
  private registries: Map<string, Registry>;

  constructor(config: any) {
    this.logger = new Logger();
    this.registries = new Map();

    // Setup HTTP client
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': '@roshan-s/shadcn-ui-mcp-server/1.0.0',
      },
    });

    // Load registries from config
    this.loadRegistries(config);
  }

  private loadRegistries(config: any): void {
    // Default shadcn registry
    this.registries.set('shadcn', {
      name: 'shadcn',
      url: 'https://ui.shadcn.com/r',
    });

    // Load custom registries from config
    if (config.registries) {
      Object.entries(config.registries).forEach(([name, registryConfig]: [string, any]) => {
        if (typeof registryConfig === 'string') {
          this.registries.set(name, {
            name,
            url: registryConfig,
          });
        } else {
          this.registries.set(name, {
            name,
            url: registryConfig.url,
            headers: registryConfig.headers,
          });
        }
      });
    }

    this.logger.info(`Loaded ${this.registries.size} registries`);
  }

  async listComponents(registryName: string, type: string = 'all'): Promise<Component[]> {
    const registry = this.registries.get(registryName);
    if (!registry) {
      throw new Error(`Registry not found: ${registryName}`);
    }

    try {
      const response = await this.httpClient.get(`${registry.url}/index.json`, {
        headers: registry.headers,
      });

      let components = response.data as Component[];

      // Filter by type if specified
      if (type !== 'all') {
        components = components.filter(c => c.type === type);
      }

      return components;
    } catch (error: any) {
      this.logger.error(`Failed to list components: ${error.message}`);
      throw error;
    }
  }

  async searchComponents(query: string, registryName?: string): Promise<Component[]> {
    const registriesToSearch = registryName
      ? [registryName]
      : Array.from(this.registries.keys());

    const results: Component[] = [];
    const lowerQuery = query.toLowerCase();

    for (const regName of registriesToSearch) {
      try {
        const components = await this.listComponents(regName);
        const matches = components.filter(
          c =>
            c.name.toLowerCase().includes(lowerQuery) ||
            c.description?.toLowerCase().includes(lowerQuery)
        );
        results.push(...matches);
      } catch (error: any) {
        this.logger.warn(`Failed to search in registry ${regName}: ${error.message}`);
      }
    }

    return results;
  }

  async getComponent(name: string): Promise<Component> {
    // Parse namespace if present (e.g., @acme/button)
    const [registryName, componentName] = name.startsWith('@')
      ? name.slice(1).split('/')
      : ['shadcn', name];

    const registry = this.registries.get(registryName);
    if (!registry) {
      throw new Error(`Registry not found: ${registryName}`);
    }

    try {
      // Replace {name} placeholder in URL
      const url = registry.url.replace('{name}', componentName);

      const response = await this.httpClient.get(`${url}.json`, {
        headers: registry.headers,
      });

      return response.data as Component;
    } catch (error: any) {
      this.logger.error(`Failed to get component ${name}: ${error.message}`);
      throw error;
    }
  }

  async listRegistries(): Promise<Registry[]> {
    return Array.from(this.registries.values());
  }
}
