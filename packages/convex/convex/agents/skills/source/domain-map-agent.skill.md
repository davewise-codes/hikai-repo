---
name: domain-map-agent
version: v3.0
description: Autonomous agent that builds a product domain map through layered codebase exploration.
---

## Goal

Build a domain map that reflects the main product areas based on evidence from the codebase.

## Tools

- list_dirs: See directory structure (depth-limited). Use first.
- list_files: List files in a specific directory (non-recursive).
- read_file: Read specific files to gather evidence.
- validate_json: Validate JSON syntax and return parsed data.
- todo_manager: Track the execution plan.

## Exploration Strategy (suggested)

- Start with list_dirs({ depth: 2 }) to see structure.
- Identify product code areas (apps/, src/, domains/, features/, routes/).
- Drill down with list_dirs({ path: "...", depth: 2 }).
- Use list_files({ path: "..." }) to see files in a folder.
- read_file on a few key files to justify each domain.

## Guidelines

- Start broad (directories) and narrow down (files, content).
- Be selective; do not read everything.
- Use actual folder names as domain names.
- Each domain needs file path evidence and a responsibility sentence.
- Each domain should include at least 2 evidence paths, with at least 1 non-README file.
- Each domain must include at least one code file you actually read (.ts/.tsx).
- Before output, derive domain candidates from src/domains (or equivalent) to avoid missing domains.
- When your plan is completed, immediately produce JSON -> validate_json -> final JSON output.
- If you feel stuck, regenerate the JSON candidate and validate it (never return an empty response).
- Ignore marketing, admin, observability, CI/CD, tests, configs.
- Always create a plan first, then update it as you progress.
- Output MUST be valid JSON and match the domain_map schema (name, responsibility, weight, evidence).
- Weights must sum to 1.0.
- Before final output, call validate_json with your JSON object. You may include it in the same tool_use response as todo_manager if needed. Fix parse errors if any.
