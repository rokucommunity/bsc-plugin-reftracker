# bsc-plugin-template
This is a template project for [BrighterScript](https://github.com/rokucommunity/brighterscript) plugins.

## Usage
Download a copy of the project and make it your own
```bash
npx degit https://github.com/rokucommunity/bsc-plugin-template bsc-plugin-awesome
```

## Features
 - uses typescript by default, as it provides the most value when navigating the complex AST properties
 - includes a small sample plugin that performs a brs AST transformation and also an XML ast transformation
 - includes sample unit tests
 - includes a default github actions workflow that also supports releasing to npm if you set the `NPM_TOKEN` secret in github.
