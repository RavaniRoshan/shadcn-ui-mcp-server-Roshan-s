import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

export class ConfigLoader {
  static load(): any {
    // Load environment variables
    dotenv.config();

    // Try to load components.json from current directory
    const componentsJsonPath = path.join(process.cwd(), 'components.json');
    let componentsConfig: any = {};

    if (fs.existsSync(componentsJsonPath)) {
      const content = fs.readFileSync(componentsJsonPath, 'utf-8');
      componentsConfig = JSON.parse(content);
    }

    // Merge with environment variables
    return {
      ...componentsConfig,
      githubToken: process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
      registryToken: process.env.REGISTRY_TOKEN,
      apiKey: process.env.API_KEY,
    };
  }
}
