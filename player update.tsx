name: Local Continue Config
version: 1.0.0
schema: v1

models:
  - name: GPT-4.1
    provider: openai
    model: gpt-4.1
    apiKey: ${{ secrets.OPENAI_API_KEY }}
    roles:
      - chat
      - edit
      - apply
      - summarize

  - name: GPT-4.1 Mini Autocomplete
    provider: openai
    model: gpt-4.1-mini
    apiKey: ${{ secrets.OPENAI_API_KEY }}
    roles:
      - autocomplete

  - name: text-embedding-3-large
    provider: openai
    model: text-embedding-3-large
    apiKey: ${{ secrets.OPENAI_API_KEY }}
    roles:
      - embed

context:
  - provider: code
  - provider: docs

rules:
  - Keep edits minimal and preserve existing project style.
  - Prefer fixing the root cause instead of adding workarounds.
