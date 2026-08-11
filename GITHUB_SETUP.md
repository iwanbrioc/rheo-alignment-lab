# GitHub setup

Recommended repository name: **`rheo-alignment-lab`**

## Development visibility
Start **private** if you want to control early circulation of the implementation and Reciprocal Wellbeing IP. Claude or another reviewer can review a private repository only if you grant/enable access through the tool they use. If that is inconvenient, a public repository is acceptable for the development code because the visible tests are already treated as contaminated development tests.

Do **not** put the eventual external sealed benchmark, private case data, API secrets, or identifiable user research data in the public repository.

## Suggested workflow
- `main` = frozen research baseline.
- each mechanism change = separate branch / pull request.
- add a `research/CHANGE_RECORD_*.md` before implementing benchmark-driven changes.
- invite adversarial review on the pull request.
- merge only after recording results, including regressions.

## Uploading this package
After creating an empty repository on GitHub, either:

```bash
git remote add origin <YOUR-REPOSITORY-URL>
git push -u origin main
```

or ask ChatGPT to populate the newly created repository through the connected GitHub integration.

## Optional app preview
For early testing, the `app/` directory is a static PWA. It can be deployed to GitHub Pages, Netlify, Cloudflare Pages, Vercel, or any static host. Do not expose participant research data through a static deployment; the present app stores only in browser localStorage.
