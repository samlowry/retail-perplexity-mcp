# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows semantic versioning intent while pre-1.0 changes may include breaking updates.

## [Unreleased]

### Changed

- MCP exposes only `perplexity_submit_question` and `perplexity_get_answer` (removed `perplexity_broker_info`).
- MCP tools call the broker directly without a preflight `/health` check (`BROKER_OFFLINE` on connection failure).

### Added

- Open-source governance and security baseline documents.
- GitHub Actions CI and secret scanning workflows.
- Dependabot configuration for npm and GitHub Actions.
