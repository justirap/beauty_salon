/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          moduleResolution: 'node',
          resolvePackageJsonExports: false,
          esModuleInterop: true,
          allowJs: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          strictNullChecks: true,
        },
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/(?!(@nestjs)/)'],
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/test/set-env.ts'],
  moduleNameMapper: {
    '^@nestjs/event-emitter$': '<rootDir>/test/event-emitter.mock.js',
  },
};
