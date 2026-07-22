// Single source of truth for domain types lives in the server package; the
// client re-exports it so both sides stay in sync without duplication.
export * from '../../server/src/types';
