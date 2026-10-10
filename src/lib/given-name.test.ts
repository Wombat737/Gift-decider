import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  firstNameFromEmail,
  givenNameFromDisplay,
  givenNameToSave,
  greetingFirstName,
  needsGivenNamePrompt,
} from './given-name';
import { stageGreeting } from './stage-home';

const morning = new Date(2026, 9, 7, 9, 41);

describe('Greeting first name', () => {
  it('uses the first word of a real display name', () => {
    assert.equal(givenNameFromDisplay('Sam Lee'), 'Sam');
    assert.equal(givenNameFromDisplay('Mary-Jane Walsh'), 'Mary-Jane');
    assert.equal(greetingFirstName({ displayName: 'Sam Lee', email: 'wade.curedale@gmail.com' }), 'Sam');
    assert.equal(needsGivenNamePrompt('Sam Lee'), false);
    assert.equal(stageGreeting('Sam Lee', morning), 'Morning, Sam');
  });

  it('does not treat an email handle as a name, and guesses from the local part', () => {
    assert.equal(givenNameFromDisplay('Wade.curedale'), null);
    assert.equal(givenNameFromDisplay('wade_curedale'), null);
    assert.equal(givenNameFromDisplay('wade.curedale@gmail.com'), null);
    assert.equal(needsGivenNamePrompt('Wade.curedale'), true);
    assert.equal(needsGivenNamePrompt(null), true);
    assert.equal(needsGivenNamePrompt(''), true);

    assert.equal(firstNameFromEmail('wade.curedale@gmail.com'), 'Wade');
    assert.equal(firstNameFromEmail('wade_curedale@gmail.com'), 'Wade');
    assert.equal(firstNameFromEmail('wade-curedale@gmail.com'), 'Wade');
    assert.equal(firstNameFromEmail('wade42home@gmail.com'), 'Wade');
    assert.equal(greetingFirstName({ displayName: 'Wade.curedale', email: 'wade.curedale@gmail.com' }), 'Wade');
    assert.equal(greetingFirstName({ displayName: null, email: 'wade.curedale@gmail.com' }), 'Wade');

    const greeting = stageGreeting('Wade.curedale', morning, 'wade.curedale@gmail.com');
    assert.equal(greeting, 'Morning, Wade');
    assert.equal(greeting.includes('.'), false);
    assert.equal(stageGreeting('Wade.curedale', morning), 'Morning');
  });

  it('saves a first name and rejects a handle', () => {
    assert.equal(givenNameToSave('  wade  '), 'Wade');
    assert.equal(givenNameToSave('wade curedale'), 'Wade');
    assert.equal(givenNameToSave('Mary-Jane'), 'Mary-Jane');
    assert.equal(givenNameToSave('wade.curedale'), null);
    assert.equal(givenNameToSave('wade@gmail.com'), null);
    assert.equal(givenNameToSave(''), null);
  });
});
