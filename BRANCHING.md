# Branching Workflow

This repo follows the same Gitflow used by `gatewaygrok-backend`.

## Main branches

- `prod`
- `staging`
- `dev`

## Feature branches

- `feat/<feature_name>`
- example: `feat/grok_image_upload`

Feature branches are always created from `dev`.

## Hotfix branches

- `hotfix/<hotfix_name>`
- example: `hotfix/fix_login_error`

Hotfix branches are always created from `prod`.

## Merge flow

### Normal feature

1. `feat/*` -> PR into `dev`
2. review and approve
3. merge into `dev`
4. when stable, merge `dev` into `staging`
5. after QA/demo pass, merge `staging` into `prod`

### Hotfix

1. create `hotfix/*` from `prod`
2. fix and push
3. PR into `prod`
4. merge `prod` back into `staging`
5. merge `prod` back into `dev`

## FE/BE pairing

If one task touches both repos, keep branch name aligned.

- FE: `feat/grok_image_upload`
- BE: `feat/grok_image_upload`

## Minimum merge gate

- React build passes
- API contract still matches backend
- no secret committed
- screenshots added if UI changed
- no direct push to `prod`
