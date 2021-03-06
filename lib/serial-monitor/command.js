/** @babel */

/**
 * Copyright (c) 2016-present PlatformIO <contact@platformio.org>
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import * as pioNodeHelpers from 'platformio-node-helpers';

import SerialMonitorView from './view';
import { commandJoin } from 'command-join';
import { runCmdsInTerminal } from '../services/terminal';

const SETTINGS_KEY = 'platformio-ide:serial-monitor-settings';

const DEFAULT_SETTINGS = {
  baud: '9600',
  parity: 'N',
  filter: 'default',
  encoding: 'UTF-8',
  eol: 'CRLF',
  dtr: '-',
  rts: '-',
  raw: '-',
  echo: '-'
};

export async function command() {
  // Initialize view
  var view = new SerialMonitorView();
  var panel = atom.workspace.addModalPanel({item: view.getElement()});

  // Set buttons handlers
  view.handleCancel = () => panel.destroy();
  view.handleOpen = () => {
    const command = ['pio', 'device', 'monitor'];
    const settings = view.getAllSettings();
    const storedSettings = new Map();
    for (const key of Object.keys(settings)) {
      if (typeof DEFAULT_SETTINGS[key] === 'undefined' || DEFAULT_SETTINGS[key] !== settings[key]) {
        command.push(`--${key}`);
        command.push(`${settings[key]}`);
        storedSettings.set(key, settings[key]);
      }
    }

    runCmdsInTerminal([commandJoin(command)]);
    panel.destroy();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(Array.from(storedSettings.entries())));
  };

  const ports = await new Promise(resolve => {
    pioNodeHelpers.core.runPIOCommand(
      ['device', 'list', '--json-output'],
      (code, stdout, stderr) => {
        if (code !== 0) {
          const title = 'PlaftormIO: Unable to get a list of serial ports.';
          atom.notifications.addError(title, {dismissable: true});
          console.error(stdout, stderr);
          return resolve([]);
        }
        resolve(JSON.parse(stdout));
      }
    );
  });
  view.setPorts(ports);

  let restoredSettings = null;
  try {
    restoredSettings = new Map(JSON.parse(localStorage.getItem(SETTINGS_KEY)));
  } catch(e) {
    console.warn('Error restoring Serial Monitor settings: ' + e);
    restoredSettings = new Map();
  }
  restoredSettings.forEach((value, key) => view.setOption(key, value));
}
