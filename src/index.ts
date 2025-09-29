#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { RegistryClient } from './registry/client.js';
import { ComponentInstaller } from './installer/installer.js';
import { ConfigLoader } from './config/loader.js';
import { Logger } from './utils/logger.js';

const logger = new Logger();

/**
 * shadcn MCP Server
 * Provides AI assistants with access to shadcn/ui component registries
 */
class ShadcnMCPServer {
  private server: Server;
  private registryClient: RegistryClient;
  private installer: ComponentInstaller;
  private config: any;

  constructor() {
    this.server = new Server(
      {
        name: '@roshan-s/shadcn-ui-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Load configuration
    this.config = ConfigLoader.load();
    this.registryClient = new RegistryClient(this.config);
    this.installer = new ComponentInstaller(this.config);

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getTools(),
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      try {
        const { name, arguments: args } = request.params;
        logger.info(`Executing tool: ${name}`);

        switch (name) {
          case 'list_components':
            return await this.listComponents(args);
          case 'search_components':
            return await this.searchComponents(args);
          case 'get_component':
            return await this.getComponent(args);
          case 'install_component':
            return await this.installComponent(args);
          case 'list_registries':
            return await this.listRegistries();
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
        logger.error(`Tool execution error: ${error.message}`);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  private getTools(): Tool[] {
    return [
      {
        name: 'list_components',
        description:
          'List all available components from a specified registry. Returns component names, descriptions, and metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            registry: {
              type: 'string',
              description:
                'Registry namespace (e.g., "shadcn", "@acme"). Defaults to "shadcn".',
            },
            type: {
              type: 'string',
              enum: ['component', 'block', 'template', 'all'],
              description: 'Type of items to list. Defaults to "all".',
            },
          },
        },
      },
      {
        name: 'search_components',
        description:
          'Search for components across all configured registries by name or description.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query (component name or description)',
            },
            registry: {
              type: 'string',
              description: 'Optional: Limit search to specific registry',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_component',
        description:
          'Get detailed information about a specific component including source code, dependencies, and installation instructions.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Component name (e.g., "button", "@acme/login-form")',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'install_component',
        description:
          'Install a component into the project. Handles dependencies, file creation, and configuration updates.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Component name to install (e.g., "button", "@acme/login-form")',
            },
            path: {
              type: 'string',
              description: 'Optional: Custom installation path',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_registries',
        description:
          'List all configured registries and their connection status. Shows available namespaces and registry URLs.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  private async listComponents(args: any) {
    const registry = args.registry || 'shadcn';
    const type = args.type || 'all';

    const components = await this.registryClient.listComponents(registry, type);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              registry,
              type,
              count: components.length,
              components,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async searchComponents(args: any) {
    const results = await this.registryClient.searchComponents(args.query, args.registry);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              query: args.query,
              count: results.length,
              results,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getComponent(args: any) {
    const component = await this.registryClient.getComponent(args.name);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(component, null, 2),
        },
      ],
    };
  }

  private async installComponent(args: any) {
    const result = await this.installer.install(args.name, args.path);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              component: args.name,
              ...result,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async listRegistries() {
    const registries = await this.registryClient.listRegistries();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(registries, null, 2),
        },
      ],
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('shadcn MCP Server running on stdio');
  }
}

// Start server
const server = new ShadcnMCPServer();
server.run().catch(error => {
  logger.error(`Server error: ${error.message}`);
  process.exit(1);
});
