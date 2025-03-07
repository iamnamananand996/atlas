import { StorybookConfig } from '@storybook/builder-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-links', '@storybook/addon-essentials'],
  framework: '@storybook/react-vite',
  viteFinal: (config) => {
    return {
      ...config,
      // override .env directory
      envDir: 'src',
      // get rid of checker plugin since it references .eslintignore at relative path, and we don't need it in storybook anyway
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      plugins: config.plugins.filter((p) => (p as any).name !== 'vite-plugin-checker'),
    }
  },
}
export default config
