/**
 * Unit tests for converter.js
 * Tests conversion, validation, and formatting functionality
 */

import { describe, it, expect } from '@jest/globals';
import {
  convertSchema,
  validateJsonSchema,
  formatJsonSchema,
  getConverterInfo,
} from '../lib/converter';

describe('Converter Library', () => {
  describe('convertSchema', () => {
    it('should convert valid JSON Schema to GraphQL SDL', async () => {
      const schema = {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: 'User',
        type: 'object',
        properties: {
          id: { type: 'string', description: 'User ID' },
          name: { type: 'string' },
        },
        required: ['id'],
      };

      const result = await convertSchema(schema);

      expect(result.success).toBe(true);
      expect(result.sdl).toBeDefined();
      expect(typeof result.sdl).toBe('string');
      expect(result.sdl).toContain('User');
      expect(result.sdl).toContain('id');
      expect(result.sdl).toContain('name');
    });

    it('should handle JSON string input', async () => {
      const schemaString = JSON.stringify({
        title: 'Product',
        type: 'object',
        properties: { id: { type: 'string' } },
      });

      const result = await convertSchema(schemaString);

      expect(result.success).toBe(true);
      expect(result.sdl).toContain('Product');
    });

    it('should return error for invalid schema', async () => {
      const result = await convertSchema(null);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.sdl).toBeNull();
    });

    it('should support conversion options', async () => {
      const schema = {
        title: 'Order',
        type: 'object',
        properties: {
          id: { type: 'string' },
          items: { type: 'array' },
        },
      };

      const result = await convertSchema(schema, {
        federation: true,
        descriptions: true,
      });

      expect(result.success).toBe(true);
      expect(result.sdl).toBeDefined();
    });

    it('should handle schema with enums', async () => {
      const schema = {
        title: 'Status',
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'pending'],
          },
        },
      };

      const result = await convertSchema(schema);

      expect(result.success).toBe(true);
      expect(result.sdl).toContain('status');
    });

    it('should handle schema with descriptions', async () => {
      const schema = {
        title: 'Document',
        description: 'A document in the system',
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Document title',
          },
        },
      };

      const result = await convertSchema(schema, { descriptions: true });

      expect(result.success).toBe(true);
      expect(result.sdl).toContain('Document');
    });
  });

  describe('validateJsonSchema', () => {
    it('should validate valid schema', () => {
      const schema = {
        title: 'Valid',
        type: 'object',
        properties: { id: { type: 'string' } },
      };

      const result = validateJsonSchema(schema);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid schema', () => {
      const result = validateJsonSchema(null);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should warn about missing schema properties', () => {
      const schema = {
        type: 'object',
        properties: {},
      };

      const result = validateJsonSchema(schema);

      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should handle JSON string input', () => {
      const schemaString = JSON.stringify({
        title: 'Test',
        type: 'object',
        properties: { id: { type: 'string' } },
      });

      const result = validateJsonSchema(schemaString);

      expect(result.valid).toBe(true);
    });
  });

  describe('formatJsonSchema', () => {
    it('should format valid JSON', () => {
      const jsonString = '{"title":"Test","type":"object"}';
      const result = formatJsonSchema(jsonString);

      expect(result).toContain('title');
      expect(result).toContain('Test');
      expect(result.includes('\n')).toBe(true); // Should have indentation
    });

    it('should throw error for invalid JSON', () => {
      expect(() => formatJsonSchema('{ invalid json }')).toThrow();
    });
  });

  describe('getConverterInfo', () => {
    it('should return converter information', () => {
      const info = getConverterInfo();

      expect(info.name).toBeDefined();
      expect(info.capabilities).toBeDefined();
      expect(Array.isArray(info.capabilities)).toBe(true);
      expect(info.capabilities.length).toBeGreaterThan(0);
    });

    it('should include federation support', () => {
      const info = getConverterInfo();

      expect(info.capabilities).toContain('Federation support');
    });
  });
});
