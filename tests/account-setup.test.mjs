import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../src/ui/AccountSetup.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;

function renderSetup(employee = false) {
  const buttons = new Map();
  const choices = [];
  const element = tag => ({ children }) => React.createElement(tag, null, children);
  const dependencies = {
    react: React,
    'react-native': { View: element('div'), ActivityIndicator: element('span') },
    'lucide-react-native': { ArrowRight: element('svg'), Building2: element('svg'), UsersRound: element('svg') },
    './AuthLayout': {
      AuthLayout: ({ title, description, children }) => React.createElement('main', null, React.createElement('h1', null, title), description, children),
      useAuthStyles: () => ({}),
    },
    './AuthMotion': { AuthMotion: element('div') },
    './LocalizedText': { Text: element('span') },
    './LocalizedPressable': { Pressable: props => {
      const label = props.accessibilityLabel ?? renderToStaticMarkup(React.createElement(React.Fragment, null, props.children)).replace(/<[^>]*>/g, '');
      buttons.set(label, props.onPress);
      return React.createElement('button', { 'aria-label': label }, props.children);
    } },
    './theme': { useTheme: () => ({ colors: {} }) },
  };
  const exports = {};
  vm.runInNewContext(source, { exports, require: name => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  const html = renderToStaticMarkup(React.createElement(exports.AccountSetup, {
    email: 'test@example.com', employee, onChoose: role => choices.push(role),
    onRetry: async () => {}, onSignOut: async () => {},
  }));
  return { html, buttons, choices };
}

test('new users can explicitly choose Employee or Admin after sign-in', () => {
  const { html, buttons, choices } = renderSetup();
  assert.match(html, /Welcome to Tempo/);
  assert.match(html, /test@example.com/);
  assert.equal(buttons.has('Employee'), true);
  assert.equal(buttons.has('Admin'), true);
  buttons.get('Employee')();
  buttons.get('Admin')();
  assert.deepEqual(choices, ['employee', 'admin']);
});

test('employees without an invitation get guidance and can correct their choice', () => {
  const { html, buttons, choices } = renderSetup(true);
  assert.match(html, /Waiting for your invitation/);
  assert.equal(buttons.has('Check invitation'), true);
  assert.equal(buttons.has('Create workspace'), false);
  buttons.get('I’m an admin instead')();
  assert.deepEqual(choices, ['admin']);
});
