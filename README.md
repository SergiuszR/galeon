# Galeon Gulp Build System

This Gulp build system processes HTML files from the `origin` folder, minifying them while preserving script and link tags.

## Features

- **HTML Minification**: Removes unnecessary whitespace and optimizes HTML
- **CSS/JS Minification**: Minifies inline CSS and JavaScript
- **Script/Link Preservation**: Keeps all `<script>` and `<link>` tags intact
- **Excluded Files**: `body.html` and `head.html` are copied without minification
- **Watch Mode**: Automatically rebuilds on file changes

## Installation

```bash
npm install
```

## Usage

### Build all files
```bash
npm run build
```

### Watch for changes
```bash
npm run watch
```

### Clean dist folder
```bash
npm run clean
```

## What Gets Processed

The build system will minify all HTML files in the `origin` folder except:
- `body.html` (copied as-is)
- `head.html` (copied as-is)

## Output

Processed files are output to the `dist` folder with the same structure as the `origin` folder.

## Gulp Tasks

- `gulp build` - Build all files
- `gulp watch` - Watch for changes and rebuild
- `gulp clean` - Clean the dist folder
- `gulp minifyHTML` - Minify HTML files only
- `gulp copyExcluded` - Copy excluded files only

## Configuration

Edit `gulpfile.js` to modify:
- Source and destination folders
- Excluded files list
- HTML minification options
