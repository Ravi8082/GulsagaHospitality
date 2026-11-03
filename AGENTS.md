<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Keep the Lovable application as a presentation-only TanStack preview with explicitly labeled member/admin sample views; the separately downloadable Node.js/MySQL application owns authenticated and persistent operations because its runtime is not hosted by this preview.
- Share hotel collection data and layout across preview routes to keep navigation and content consistent.
