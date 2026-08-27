import matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import 'cross-fetch/polyfill';
// @icp-sdk/auth persists its session key in IndexedDB, which jsdom does not
// implement.
import 'fake-indexeddb/auto';
import { afterEach, expect } from 'vitest';

expect.extend(matchers);

// Testing Library only auto-registers this when vitest runs with globals on.
afterEach(cleanup);
