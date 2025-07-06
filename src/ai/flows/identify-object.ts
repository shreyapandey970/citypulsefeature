'use server';

/**
 * @fileOverview An AI agent that identifies objects (potholes or garbage) in an image.
 *
 * - identifyObject - A function that handles the object identification process.
 * - IdentifyObjectInput - The input type for the identifyObject function.
 * - IdentifyObjectOutput - The return type for the identifyObject function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IdentifyObjectInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of the area, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  location: z.string().describe('The location of the image taken.'),
});
export type IdentifyObjectInput = z.infer<typeof IdentifyObjectInputSchema>;

const IdentifyObjectOutputSchema = z.object({
  objectType: z
    .enum(['pothole', 'garbage', 'none'])
    .describe('The type of object identified in the image.'),
  confidence: z
    .number()
    .describe('The confidence level of the object identification (0-1).'),
});
export type IdentifyObjectOutput = z.infer<typeof IdentifyObjectOutputSchema>;

export async function identifyObject(input: IdentifyObjectInput): Promise<IdentifyObjectOutput> {
  return identifyObjectFlow(input);
}

const prompt = ai.definePrompt({
  name: 'identifyObjectPrompt',
  input: {schema: IdentifyObjectInputSchema},
  output: {schema: IdentifyObjectOutputSchema},
  prompt: `You are an AI assistant specialized in identifying objects in images, specifically potholes and garbage.

  Analyze the image provided and determine if it contains a pothole, garbage, or neither.

  Location: {{{location}}}
  Photo: {{media url=photoDataUri}}

  Output the object type and your confidence level as a JSON object.
`,
});

const identifyObjectFlow = ai.defineFlow(
  {
    name: 'identifyObjectFlow',
    inputSchema: IdentifyObjectInputSchema,
    outputSchema: IdentifyObjectOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
