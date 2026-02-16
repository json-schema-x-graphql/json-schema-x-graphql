# Slidev Configuration & Advanced Usage

This guide provides advanced configuration options and tips for the Schema Unification Forest presentation.

## Installation

```bash
# Install Slidev CLI globally
npm install -g @slidev/cli

# Or install locally in the project
npm install -D @slidev/cli

# Then run with npx
npx slidev slides.md
```

## Running the Presentation

```bash
# Start development server
slidev slides.md

# Start on specific port
slidev slides.md --port 3030

# Start in fullscreen mode
slidev slides.md --fullscreen

# Start with drawing tools enabled
slidev slides.md --with-canvas

# Watch for changes and auto-reload
slidev slides.md --watch
```

## Presenter Mode Features

Press `P` to enter presenter mode (requires opening the URL in a separate window):

1. **Current Slide** - Full-screen view
2. **Next Slide Preview** - See what's coming
3. **Speaker Notes** - Notes from `<!--` comments in slides
4. **Slide Timer** - Track presentation time
5. **Presenter Remote** - Control from mobile device

## Export Options

### Export to PDF

```bash
# Standard PDF
slidev export slides.md --format pdf

# With animations (creates long document)
slidev export slides.md --format pdf --with-animation
```

### Export to HTML

```bash
# Single HTML file (self-contained)
slidev export slides.md --format html

# With speaker notes
slidev export slides.md --format html --with-notes

# Dark mode
slidev export slides.md --format html --dark
```

### Export to Images

```bash
# PNG images (one per slide)
slidev export slides.md --format png

# JPEG images
slidev export slides.md --format jpg

# Specify output directory
slidev export slides.md --format png --output ./presentation-images
```

## Theme Options

The following themes are available with Slidev:

```yaml
# In the frontmatter of slides.md
theme: default          # Clean, minimal (recommended for technical talks)
theme: apple-basic      # Apple Keynote style
theme: seriph           # Typography and serif fonts focused
theme: geist            # Dark, modern design
theme: dracula          # Dark with Dracula colors
```

To use a different theme:

1. Edit the `theme:` line at the top of `slides.md`
2. Save and the presentation will update automatically

## Advanced Frontmatter Options

```yaml
---
# Metadata
theme: default
title: Schema Unification Forest
titleTemplate: "%s - Slidev"
info: Project description
keywords: schema, graphql, json, federal

# Author & Date
author: GSA-TTS
date: 2025-12-11

# Appearance
layout: cover # Layout type for this slide
class: text-center # CSS classes
transition: slide # Animation type

# Features
drawings:
  enabled: true # Allow drawing on slides
  presenterOnly: false # Show drawings to everyone
  syncAll: true # Sync drawings across devices

# Export settings
exportFilename: schema-unification-project-slides

# Navigation
autoPlayVideos: false # Auto-play embedded videos
canvasWidth: 960 # Canvas width in pixels
ratio: 16/9 # Slide ratio

# Recording
record: dev # dev, build, or false
---
```

## Interactive Elements

### Code Highlighting

````
` ``` ` python
print("Hello, Schema Unification Forest!")
` ``` `
````

Supported languages: python, javascript, typescript, json, yaml, bash, graphql, sql, and many more.

### Embedded Content

```markdown
<!-- Embed YouTube video -->
<iframe width="100%" height="400" 
  src="https://www.youtube.com/embed/dQw4w9WgXcQ">
</iframe>

<!-- Embed external website -->
<iframe src="https://example.com" width="100%" height="400"></iframe>
```

### Click Animations

```markdown
- Item 1 {.fragment}
- Item 2 {.fragment}
- Item 3 {.fragment}
```

This reveals items one by one when clicking/pressing space.

## Speaker Notes

Add notes that only appear in presenter mode:

```markdown
# Slide Title

Visible content here

<!--
These notes are only visible when pressing P for presenter mode.
Use them for:
- Talking points
- Key statistics
- Difficult transitions
- Time estimates
-->
```

## Styling

### TailwindCSS Classes

The presentation supports TailwindCSS classes:

```markdown
<div class="text-center bg-blue-50 p-4 rounded">
  <h3 class="text-xl font-bold text-blue-900">Title</h3>
  <p class="text-sm opacity-75">Subtitle</p>
</div>
```

Common useful classes:

- `text-center` - Center text
- `flex gap-4` - Flex layout with gap
- `grid grid-cols-2` - 2-column grid
- `p-4` - Padding
- `rounded` - Border radius
- `bg-blue-50` - Light background color
- `opacity-75` - Semi-transparent

### Custom CSS

Create `style.css` in the same directory for custom styles:

```css
.container {
  max-width: 900px;
  margin: 0 auto;
}

.highlight {
  background-color: yellow;
  padding: 2px 4px;
  border-radius: 3px;
}
```

## Publishing

### Host on GitHub Pages

```bash
# Export static site
slidev build slides.md

# Deploy dist/ directory to GitHub Pages
git add dist/
git commit -m "build: export slides"
git push
```

### Share as PDF

```bash
# Export to PDF
slidev export slides.md --format pdf

# Share via email or drive
```

### Embed in Documentation

```html
<!-- In your docs HTML -->
<iframe src="/presentations/slides.html" width="100%" height="600"></iframe>
```

## Keyboard Shortcuts Reference

| Key                        | Action                              |
| -------------------------- | ----------------------------------- |
| `Space` / `Right Arrow`    | Next slide                          |
| `Left Arrow` / `Backspace` | Previous slide                      |
| `Up Arrow` / `Down Arrow`  | Navigate                            |
| `Home`                     | First slide                         |
| `End`                      | Last slide                          |
| `Number + Enter`           | Jump to slide                       |
| `O`                        | Overview (grid view)                |
| `P`                        | Presenter mode                      |
| `D`                        | Toggle dark mode                    |
| `G`                        | Toggle grid                         |
| `S`                        | Toggle slide numbers                |
| `M`                        | Toggle microphone (audio recording) |
| `R`                        | Reset view                          |
| `ESC`                      | Exit fullscreen                     |
| `?`                        | Show help                           |

## Recording & Streaming

### Record Locally

```bash
# Start with recording enabled
slidev slides.md --record dev

# Output will be saved as .webm file
```

### Screen Share

```bash
# Stream to specific resolution
slidev slides.md --resolution 1920x1080
```

## Troubleshooting

### Slides not updating

- Make sure you're in watch mode: `slidev slides.md --watch`
- Check browser cache: reload with Ctrl+Shift+R

### Export fails

- Try updating Slidev: `npm install -g @slidev/cli@latest`
- Check file permissions
- Ensure all dependencies are installed

### Performance issues

- Reduce animations
- Disable auto-play features
- Close browser tabs
- Use `--with-canvas` flag with caution on large presentations

## Tips & Tricks

1. **Use speaker notes for timing** - Add estimated time for each slide
2. **Export to PDF early** - Keep a PDF backup during development
3. **Test all links** - Verify external links before presenting
4. **Practice with presenter mode** - Get comfortable with the layout
5. **Have a backup plan** - Export HTML for offline presentation
6. **Use consistent styling** - Establish a visual pattern across slides
7. **Add interaction** - Use fragments to reveal key points

## Resources

- **Official Docs**: https://sli.dev
- **Theme Gallery**: https://sli.dev/themes/gallery.html
- **Component Library**: https://sli.dev/guide/syntax
- **Best Practices**: https://sli.dev/guide/presenter-mode

---

**For the Schema Unification Forest Presentation:**

```bash
# Start development
slidev slides.md --watch

# Export to PDF for sharing
slidev export slides.md --format pdf

# Export to HTML for embedding in docs
slidev export slides.md --format html

# Start with presenter mode ready
slidev slides.md --with-canvas
```
