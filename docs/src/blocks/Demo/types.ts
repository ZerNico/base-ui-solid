import type { Component } from 'solid-js';

// Port note: only the types of upstream's `blocks/Demo` are ported. Its React components are
// replaced by `components/Demo`.
export interface DemoFile {
  /**
   * Absolute path to the file.
   */
  path: string;
  /**
   * Base name of the file.
   */
  name: string;
  /**
   * Content of the file.
   */
  content: string;
  /**
   * Type of the file.
   */
  type: string;
}

export interface DemoVariant {
  /**
   * Variant identifier.
   */
  name: string;
  /**
   * Language of the entry point file.
   */
  language: 'ts' | 'js';
  /**
   * Runnable demo component.
   */
  component: Component;
  /**
   * Files the demo consists of.
   */
  files: DemoFile[];
}
