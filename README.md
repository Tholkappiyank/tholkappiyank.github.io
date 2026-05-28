# Tholkappiyan K - Portfolio

Portfolio website for Tholkappiyan K, an Indie Game Developer and Game Programmer.

## Features

- **Portfolio Grid** — Dynamic project showcase with thumbnails
- **Project Modals** — Detailed view for each project with:
  - YouTube video embedding
  - Image carousel with screenshots
  - Download links
- **Responsive Design** — Built with Bootstrap 3
- **Resume Section** — Inline iframe with full resume

## Project Data

Projects are defined in `js/projectInfo.js`. Each project supports:

| Field | Description |
|---|---|
| `ID` | Unique project identifier |
| `Name` | Project title |
| `SmallDescription` | Short tagline |
| `LargeDescription` | Full project description (HTML) |
| `DownloadLink` | Optional download URL |
| `EmbedVideoLinkID` | YouTube video ID for embedding |
| `NoOfProjectImages` | Number of screenshots in `img/portfolio/{ID}/` |
| `CarouselWidth` | Image width percentage in modal |
| `ShowSlider` | Whether to show the image width slider |


## Tech Stack

- HTML5, CSS3, JavaScript (vanilla + jQuery 1.12.4)
- Bootstrap 3, Font Awesome 4.6.3
- Hosted on GitHub Pages
