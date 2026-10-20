// PowerShell resolves `npm` to npm.ps1, and that script consumes one `--`.
// The invocation that works in PowerShell, cmd, and bash is:
//   npm run <script> -- -- --flag value
// On cmd and bash the extra `--` is forwarded. Commander treats it as the
// end of options, so every flag after it would be ignored.

/** Full `process.argv` for Commander, without bare `--` separators. */
export function commandArgv(): string[] {
  return process.argv.filter((arg) => arg !== "--");
}

/** Arguments after the script path, without bare `--` separators. */
export function scriptArgv(): string[] {
  return process.argv.slice(2).filter((arg) => arg !== "--");
}
