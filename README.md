# MUXT

<p align="center">
  <img src="1024x1024muxt.png" alt="MUXT Logo" width="128" height="128">
</p>

<p align="center">
  <strong>Multi-column social media viewer for desktop</strong>
</p>

<p align="center">
  View X, LinkedIn, Bluesky, Threads, and Reddit side-by-side in a single window.
</p>

---

## Features

- **Multi-column view** - Display up to 5 social platforms simultaneously
- **Synchronized scrolling** - Scroll all feeds together for a unified experience
- **Resizable columns** - Drag to resize columns to your preference
- **Toggleable feeds** - Show/hide individual platforms with a click
- **Drag-and-drop reordering** - Arrange platforms in any order you like
- **Built-in ad blocking** - Powered by Ghostery for a cleaner experience
- **Dark mode** - Enforced dark theme across all platforms
- **Auto-dimming** - Unfocused views dim when navigating into posts
- **Automatic updates** - Stay up-to-date with the latest features and security patches
- **Persistent settings** - Your layout and visibility preferences are saved

## Supported Platforms

| Platform | URL |
|----------|-----|
| X (Twitter) | x.com |
| LinkedIn | linkedin.com |
| Bluesky | bsky.app |
| Threads | threads.net |
| Reddit | reddit.com |

## Installation

### Download

Download the latest release from the [GitHub Releases](https://github.com/owner/muxt/releases) page.

### macOS

1. Download `MUXT-x.x.x-mac.zip`
2. Extract the archive
3. Move `MUXT.app` to your Applications folder
4. On first launch, right-click and select "Open" to bypass Gatekeeper

## Development

MUXT uses Docker for development to ensure consistent builds across environments.

### Prerequisites

- [Docker](https://www.docker.com/get-started) and Docker Compose
- Node.js 20+ (for local development without Docker)

### Setup

```bash
# Clone the repository
git clone https://github.com/owner/muxt.git
cd muxt

# Install dependencies (via Docker)
docker-compose run --rm app npm install
```

### Development Server

```bash
# Start development server
docker-compose run --rm -p 5173:5173 app npm run dev
```

Note: The Electron app requires a display, so for full testing you may need to run locally:

```bash
npm install
npm run dev
```


### Building

Production builds are handled by GitHub Actions to keep your local machine clean. When you push a tag, the workflow automatically:

1. Runs tests
2. Builds for macOS, Windows, and Linux
3. Creates a GitHub Release with all artifacts

To create a release:

```bash
# Tag a new version
git tag v1.0.0
git push origin v1.0.0
```

The GitHub Actions workflow will build and publish the release automatically.

#### Local Development Builds (Docker)

For testing the build process locally without installing dependencies on your machine:

```bash
# TypeScript compilation and Vite build only (no packaging)
docker-compose run --rm -v $(pwd):/app app sh -c "npm install && npm run build"
```

Note: Full electron-builder packaging requires running on the target OS (macOS for .app, Windows for .exe, etc.) and is best done via GitHub Actions.

### Testing

```bash
# Run tests
docker-compose run --rm -v $(pwd):/app app sh -c "npm install && npm test"
```

## Tech Stack

- **Electron 39** - Desktop application framework
- **React 19** - UI framework
- **TypeScript 5.5** - Type-safe JavaScript
- **Vite 6** - Build tool and dev server
- **Tailwind CSS 3.4** - Utility-first CSS
- **electron-updater** - Automatic updates via GitHub Releases

## Project Structure

```
src/
├── main/           # Electron main process
│   ├── main.ts     # App entry, window/view management, IPC handlers
│   ├── settings.ts # Persistent settings manager
│   ├── autoUpdater.ts # Auto-update functionality
│   └── updateChecker.ts # Electron version security checks
├── preload/        # Electron preload scripts
│   └── preload.ts  # Context bridge, scroll sync, IPC exposure
└── renderer/       # React frontend
    ├── main.tsx    # React app entry point
    ├── components/ # React components
    └── lib/        # Utilities
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  Made with ❤️ for social media enthusiasts
</p>
