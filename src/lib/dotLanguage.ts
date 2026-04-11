import { Monaco } from '@monaco-editor/react';

export function registerDotLanguage(monaco: Monaco) {
  monaco.languages.register({ id: 'dot' });

  monaco.languages.setMonarchTokensProvider('dot', {
    tokenizer: {
      root: [
        [/[a-zA-Z_][a-zA-Z0-9_]*/, 'identifier'],
        [/"[^"]*"/, 'string'],
        [/[{}();,]/, 'delimiter'],
        [/[=]/, 'operator'],
        [/\/\/.*/, 'comment'],
        [/\/\*.*\*\//, 'comment'],
      ],
    },
  });

  monaco.languages.registerCompletionItemProvider('dot', {
    provideCompletionItems: () => {
      return {
        suggestions: [
          { label: 'digraph', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'digraph ${1:name} {\n\t$0\n}' },
          { label: 'node', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'node [${1:attr}=${2:value}];' },
          { label: 'edge', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'edge [${1:attr}=${2:value}];' },
        ],
      };
    },
  });
}
