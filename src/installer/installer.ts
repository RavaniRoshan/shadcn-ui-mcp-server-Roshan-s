import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../utils/logger.js';
import { RegistryClient } from '../registry/client.js';

export interface InstallResult {
  installedFiles: string[];
  dependencies: string[];
  message: string;
}

export class ComponentInstaller {
  private logger: Logger;
  private registryClient: RegistryClient;
  private config: any;

  constructor(config: any) {
    this.logger = new Logger();
    this.config = config;
    this.registryClient = new RegistryClient(config);
  }

  async install(componentName: string, customPath?: string): Promise<InstallResult> {
    this.logger.info(`Installing component: ${componentName}`);

    // Fetch component details
    const component = await this.registryClient.getComponent(componentName);

    // Determine installation path
    const basePath = customPath || this.config.componentsPath || './components';

    // Install files
    const installedFiles: string[] = [];

    if (component.files) {
      for (const file of component.files) {
        const filePath = path.join(basePath, file.path);

        // Create directory if it doesn't exist
        await fs.mkdir(path.dirname(filePath), { recursive: true });

        // Write file content
        await fs.writeFile(filePath, file.content, 'utf-8');

        installedFiles.push(filePath);
        this.logger.info(`Created file: ${filePath}`);
      }
    }

    return {
      installedFiles,
      dependencies: component.dependencies || [],
      message: `Successfully installed ${componentName}`,
    };
  }
}
