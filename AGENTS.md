# Finco contributor instructions

Before implementing or modifying UI, read `DESIGN.md` and consult the relevant guidelines in `awesome-design-md/design-md/`. Start with `coinbase/DESIGN.md` for financial clarity and `wise/DESIGN.md` for readable financial flows. Treat references as design guidance; preserve Finco's identity and product behavior.

`awesome-design-md/` is a Git submodule. Initialize it with `git submodule update --init --recursive`; do not copy its files into the repository or edit the upstream checkout.

Keep marketing styles scoped to the landing page. Changes to the landing page must not alter the financial graph, dashboard, authentication behavior, or shared application tokens. Run the available type, lint, build, and browser checks before committing.
