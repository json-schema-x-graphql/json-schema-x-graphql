import React, { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { MonacoBinding } from 'y-monaco';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

interface MonacoEditorProps {
  value: string;
  language: 'json' | 'graphql';
  onChange?: (value: string) => void;
  ydoc?: Y.Doc | null;
  provider?: WebsocketProvider | null;
  textKey: string;
  readOnly?: boolean;
  height?: string;
  className?: string;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  value,
  language,
  onChange,
  ydoc,
  provider,
  textKey,
  readOnly = false,
  height = '100%',
  className = '',
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);

  const handleEditorDidMount = (
    editor: monaco.editor.IStandaloneCodeEditor,
    monacoInstance: typeof monaco
  ) => {
    editorRef.current = editor;

    // Configure editor
    editor.updateOptions({
      minimap: { enabled: true },
      fontSize: 14,
      lineNumbers: 'on',
      roundedSelection: true,
      scrollBeyondLastLine: false,
      readOnly,
      automaticLayout: true,
      tabSize: 2,
      insertSpaces: true,
      wordWrap: 'on',
      wrappingIndent: 'indent',
    });

    // Setup Yjs binding if available
    if (ydoc && provider) {
      const ytext = ydoc.getText(textKey);
      const awareness = provider.awareness;

      // Create Monaco binding
      bindingRef.current = new MonacoBinding(
        ytext,
        editor.getModel()!,
        new Set([editor]),
        awareness
      );

      // Listen for cursor changes
      editor.onDidChangeCursorPosition((e) => {
        const position = e.position;
        if (awareness) {
          awareness.setLocalStateField('cursor', {
            line: position.lineNumber,
            column: position.column,
            textKey,
          });
        }
      });

      // Style remote cursors
      const style = document.createElement('style');
      style.innerHTML = `
        .yRemoteSelection {
          background-color: rgba(250, 129, 0, 0.3);
        }
        .yRemoteSelectionHead {
          position: absolute;
          border-left: 2px solid orange;
          border-top: 2px solid orange;
          border-bottom: 2px solid orange;
          height: 100%;
          box-sizing: border-box;
        }
        .yRemoteSelectionHead::after {
          position: absolute;
          content: ' ';
          border: 3px solid orange;
          border-radius: 4px;
          left: -4px;
          top: -5px;
        }
      `;
      document.head.appendChild(style);
    } else {
      // Non-collaborative mode: use local onChange
      editor.onDidChangeModelContent(() => {
        const currentValue = editor.getValue();
        if (onChange) {
          onChange(currentValue);
        }
      });
    }

    // Add JSON Schema validation for JSON editor
    if (language === 'json') {
      monacoInstance.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        schemas: [
          {
            uri: 'http://json-schema.org/draft-07/schema#',
            fileMatch: ['*'],
            schema: {
              type: 'object',
              properties: {
                $schema: { type: 'string' },
                $id: { type: 'string' },
                $ref: { type: 'string' },
                $comment: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                type: {
                  oneOf: [
                    { type: 'string' },
                    { type: 'array', items: { type: 'string' } },
                  ],
                },
                properties: { type: 'object' },
                required: { type: 'array', items: { type: 'string' } },
                additionalProperties: {},
                definitions: { type: 'object' },
                $defs: { type: 'object' },
              },
            },
          },
        ],
      });
    }

    // Add GraphQL syntax support
    if (language === 'graphql') {
      // Register GraphQL language if not already registered
      const languages = monacoInstance.languages.getLanguages();
      if (!languages.some((lang) => lang.id === 'graphql')) {
        monacoInstance.languages.register({ id: 'graphql' });

        monacoInstance.languages.setMonarchTokensProvider('graphql', {
          keywords: [
            'type',
            'interface',
            'union',
            'enum',
            'input',
            'extend',
            'schema',
            'directive',
            'scalar',
            'implements',
            'fragment',
            'query',
            'mutation',
            'subscription',
            'on',
            'null',
            'true',
            'false',
          ],
          typeKeywords: ['String', 'Int', 'Float', 'Boolean', 'ID'],
          operators: ['=', '!', '?', ':', '&', '|', '@'],
          symbols: /[=><!~?:&|+\-*\/\^%]+/,

          tokenizer: {
            root: [
              [
                /[a-zA-Z_][\w]*/,
                {
                  cases: {
                    '@keywords': 'keyword',
                    '@typeKeywords': 'type',
                    '@default': 'identifier',
                  },
                },
              ],
              { include: '@whitespace' },
              [/[{}()\[\]]/, '@brackets'],
              [/[<>](?!@symbols)/, '@brackets'],
              [/@symbols/, { cases: { '@operators': 'operator', '@default': '' } }],
              [/"([^"\\]|\\.)*$/, 'string.invalid'],
              [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],
              [/\d+/, 'number'],
            ],

            string: [
              [/[^\\"]+/, 'string'],
              [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }],
            ],

            whitespace: [
              [/[ \t\r\n]+/, 'white'],
              [/#.*$/, 'comment'],
            ],
          },
        });

        monacoInstance.languages.setLanguageConfiguration('graphql', {
          comments: {
            lineComment: '#',
          },
          brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
          ],
          autoClosingPairs: [
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: '"', close: '"' },
          ],
          surroundingPairs: [
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: '"', close: '"' },
          ],
        });
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
      }
    };
  }, []);

  return (
    <div className={`monaco-editor-wrapper ${className}`} style={{ height }}>
      <Editor
        height={height}
        defaultLanguage={language}
        value={!ydoc ? value : undefined}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          readOnly,
          minimap: { enabled: true },
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: true,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          wordWrap: 'on',
        }}
      />
    </div>
  );
};
