import { ConvertInput, ConversionResult } from './generated/types';
export interface IJsonSchemaConverter {
    convert(input: ConvertInput): Promise<ConversionResult>;
}
