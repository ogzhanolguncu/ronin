export function html(strings: TemplateStringsArray, ...values: unknown[]) {
  return String.raw(strings, ...values);
}
