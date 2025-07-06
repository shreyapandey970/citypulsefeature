'use server';

/**
 * @fileOverview An AI agent that verifies a reported issue against an image.
 *
 * - identifyObject - A function that handles the object identification and verification process.
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
  issueType: z.enum(['pothole', 'garbage', 'streetlight', 'fallen_tree', 'other'])
    .describe('The type of issue reported by the user.'),
});
export type IdentifyObjectInput = z.infer<typeof IdentifyObjectInputSchema>;

const IdentifyObjectOutputSchema = z.object({
  isMatch: z.boolean().describe("True if the image content matches the reported issueType, false otherwise."),
  identifiedType: z
    .enum(['pothole', 'garbage', 'streetlight', 'fallen_tree', 'other', 'none'])
    .describe('The type of object identified in the image, regardless of the input issueType.'),
  confidence: z
    .number()
    .describe('The confidence level of the identification (0-1).'),
});
export type IdentifyObjectOutput = z.infer<typeof IdentifyObjectOutputSchema>;

export async function identifyObject(input: IdentifyObjectInput): Promise<IdentifyObjectOutput> {
  return identifyObjectFlow(input);
}

const prompt = ai.definePrompt({
  name: 'identifyObjectPrompt',
  input: {schema: IdentifyObjectInputSchema},
  output: {schema: IdentifyObjectOutputSchema},
  prompt: `You are an AI assistant designed to verify public grievance reports.
The user has reported the following issue:
- Issue Type: {{{issueType}}}
- Location: {{{location}}}

Analyze the provided photo: {{media url=photoDataUri}}

Your tasks are:
1. Identify the primary subject in the photo from the following categories: 'pothole', 'garbage', 'streetlight', 'fallen_tree', 'other', or 'none'.
2. Determine if your identification matches the user's reported \`issueType\`.
3. Provide a confidence score for your identification.

Respond with a JSON object that includes \`isMatch\`, \`identifiedType\`, and \`confidence\`.
- Set \`isMatch\` to \`true\` if your \`identifiedType\` is the same as the user's \`issueType\`.
- \`identifiedType\` should be your best guess of what is in the image.
- For \`streetlight\`, this could mean a broken or unlit streetlight.
- For \`fallen_tree\`, this could be a large branch or a whole tree blocking a path or road.
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
