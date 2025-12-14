# GitHub Action: Generate Slides PDF

## Overview

Automatically generates PDF, HTML, and PNG exports of the Slidev presentation whenever `slides.md` is updated.

**Location:** `.github/workflows/generate-slides-pdf.yml`

## What It Does

### Triggers

The workflow runs automatically when:

1. **Push to main branch** with changes to `slides.md`
2. **Push to development branch** (json-graphql-schema-diff-cleanup-v2) with changes to `slides.md`
3. **Manual trigger** via `workflow_dispatch` (Run workflow button in GitHub UI)
4. **Workflow file changes** - Re-run if you update the workflow itself

### Exports Generated

- **PDF** - `slides-presentation.pdf` (high quality, shareable)
- **HTML** - `slides-presentation.html` (interactive, self-contained)
- **PNG Images** - One file per slide in `slides-output/` directory

### Artifacts

All generated files are available as:

1. **GitHub Actions Artifacts** - Download from Actions tab (30-day retention)
2. **Git Repository** - Automatically committed if changes detected
3. **GitHub Releases** - PDF and HTML attached to releases (main branch only)
4. **Release Management** - Attach to GitHub releases (main branch only, when slides change)

## How to Use

### Automatic Trigger

Simply push changes to `slides.md`:

```bash
git add slides.md
git commit -m "Update presentation slides"
git push origin json-graphql-schema-diff-cleanup-v2
```

The workflow automatically runs and generates all exports.

### Manual Trigger

1. Go to GitHub repository
2. Click **Actions** tab
3. Select **Generate Slides PDF** workflow
4. Click **Run workflow** button
5. Choose branch and run

### Download Generated Files

**After workflow completes:**

1. Click **Actions** tab
2. Click the most recent run
3. Scroll to "Artifacts" section
4. Download:
   - `slides-exports` - Contains all generated files

## Generated Files

### PDF Export

- **Format**: High-quality PDF
- **Use**: Email, sharing, printing
- **Location**: Repository root or artifacts
- **Size**: ~5-10 MB typically

### HTML Export

- **Format**: Self-contained HTML file
- **Use**: Website embedding, interactive sharing
- **Location**: Repository root or artifacts
- **Features**: Interactive slides, presenter mode, keyboard navigation

### PNG Images

- **Format**: One PNG per slide (1920x1080)
- **Use**: Social media, documentation, previews
- **Location**: `slides-output/` directory
- **Total**: 28 images (one per slide)

## Workflow Details

### Environment

- **Runner**: Ubuntu latest
- **Node.js**: Version 18
- **Slidev CLI**: Latest version

### Steps

1. **Checkout** - Clone the repository
2. **Setup Node.js** - Install Node.js 18
3. **Install Slidev CLI** - Global installation
4. **Install Dependencies** - npm install
5. **Generate PDF** - Slidev PDF export
6. **Generate HTML** - Slidev HTML export
7. **Generate Images** - Slidev PNG export (all slides)
8. **Upload Artifacts** - Store for 30 days
9. **Commit & Push** - Save to repository (if changes)
10. **Create Release** - Attach to GitHub release (main only)
11. **Comment on PR** - Notify about exports (PR only)
12. **Verify** - Confirm PDF generation succeeded

### Permissions

The workflow needs:

- **contents:write** - Commit generated files back to repo
- **pull-requests:write** - Comment on pull requests

## File Structure

After workflow runs:

```
repository/
├── slides.md (source)
├── slides-presentation.pdf (generated)
├── slides-presentation.html (generated)
├── slides-output/ (generated)
│   ├── 1.png
│   ├── 2.png
│   ├── 3.png
│   └── ... (one per slide)
└── .github/workflows/
    └── generate-slides-pdf.yml (this workflow)
```

## Customization

### Change Export Formats

Edit the workflow file to modify export options:

```yaml
- name: Generate PDF
  run: |
    slidev export slides.md \
      --format pdf \
      --output slides-presentation.pdf
```

### Adjust Retention Days

Change the artifacts retention:

```yaml
retention-days: 30  # Set between 1 and 90 (max for public repos; org policy may lower this)
```

### Add New Branches

Update the trigger branches:

```yaml
on:
  push:
    branches:
      - main
      - json-graphql-schema-diff-cleanup-v2
      - staging  # Add new branch
```

### Disable Auto-Commit

Remove or comment out the commit step to prevent auto-pushing:

```yaml
# - name: Commit and push artifacts
#   run: git commit -m "..."
```

## Troubleshooting

### PDF Generation Fails

**Symptom**: Workflow fails at "Generate PDF" step

**Solutions**:
1. Check `slides.md` syntax - ensure no broken Mermaid diagrams
2. Verify Node.js version compatibility
3. Check disk space on runner
4. Re-run workflow

### Files Not Committed

**Symptom**: Generated files appear in artifacts but not in repository

**Solutions**:
1. Check `contents:write` permission is set
2. Verify branch protection rules allow writes
3. Check GitHub Action configuration
4. Manual commit: `git add slides-presentation.pdf && git commit -m "..."`

### Large PDF Size

**Symptom**: PDF file is very large (>20 MB)

**Solutions**:
1. Reduce image quality in Slidev config
2. Remove high-resolution images from slides
3. Use HTML export instead for web sharing

### PNG Export Too Slow

**Symptom**: Workflow takes >30 minutes

**Solutions**:
1. Disable PNG export if not needed
2. Comment out the PNG generation step
3. Run manually only when needed

## Integration Examples

### Share via Email

```bash
# Download PDF from Actions
# Attach to email or share via OneDrive/Google Drive
```

### Embed in Documentation

```html
<!-- In your README or docs -->
<iframe src="slides-presentation.html" width="100%" height="600px"></iframe>
```

### Social Media Preview

```bash
# Use first slide PNG (1.png) as preview
# Post to Twitter, LinkedIn with image attachment
```

### GitHub Pages

```bash
# Copy HTML to docs/ directory for automatic hosting
cp slides-presentation.html docs/slides.html
```

## Security Considerations

- **Token**: Uses `GITHUB_TOKEN` (automatically scoped)
- **Commits**: Marked with `[skip ci]` to prevent workflow loops
- **Artifacts**: 30-day retention (adjustable)
- **Releases**: Only on main branch (configurable)

## Performance

- **Typical run time**: 3-5 minutes
- **PDF generation**: ~1 minute
- **HTML generation**: ~30 seconds
- **PNG generation**: ~90 seconds (28 slides)
- **Upload/commit**: ~30 seconds

## Related Files

- **Slides**: `slides.md`
- **Documentation**: `SLIDES-README.md`, `SLIDES-ADVANCED.md`
- **Other workflows**: `.github/workflows/`

## Support

For issues with the workflow:

1. Check GitHub Actions logs
2. Review workflow syntax: [GitHub Workflows Documentation](https://docs.github.com/en/actions)
3. Verify Slidev installation: `slidev --version`
4. Check repository permissions and settings

## Next Steps

1. **First run** - Push a change to `slides.md`
2. **Monitor** - Watch Actions tab for completion
3. **Download** - Grab artifacts from Actions
4. **Share** - Distribute PDF or HTML to stakeholders
5. **Iterate** - Update slides, workflow re-runs automatically

---

**Created**: December 11, 2025  
**Status**: Active  
**Branch**: main, json-graphql-schema-diff-cleanup-v2  
**Triggered by**: `slides.md` changes or manual dispatch
