// AssessSeverityFlow.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for assessing the severity of a reported environmental issue.
 *
 * - assessSeverity - A function that takes image, location, and confirmation data to determine the severity of the issue.
 * - AssessSeverityInput - The input type for the assessSeverity function.
 * - AssessSeverityOutput - The return type for the assessSeverity function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AssessSeverityInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of the issue, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  location: z
    .string()
    .describe(
      'The GPS coordinates of the reported issue (latitude, longitude).'
    ),
  isConfirmed: z
    .boolean()
    .describe(
      'Boolean value to check the issue is confirmed by the user or not'
    ),
  issueType: z
    .enum(['pothole', 'garbage', 'streetlight', 'fallen_tree', 'other'])
    .describe('The type of reported issue.'),
});

export type AssessSeverityInput = z.infer<typeof AssessSeverityInputSchema>;

const AssessSeverityOutputSchema = z.object({
  severity: z
    .enum(['high', 'medium', 'low'])
    .describe(
      'The assessed severity of the reported issue (high, medium, or low).'
    ),
  justification: z
    .string()
    .describe(
      'Explanation for the severity level of the issue to improve transparency.'
    ),
});

export type AssessSeverityOutput = z.infer<typeof AssessSeverityOutputSchema>;

export async function assessSeverity(input: AssessSeverityInput): Promise<AssessSeverityOutput> {
  return assessSeverityFlow(input);
}

const assessSeverityPrompt = ai.definePrompt({
  name: 'assessSeverityPrompt',
  input: {schema: AssessSeverityInputSchema},
  output: {schema: AssessSeverityOutputSchema},
  prompt: `You are an AI assistant designed to assess the severity of environmental issues.

      Based on the provided image, location, confirmation status, and issue type, determine the severity of the issue as high, medium, or low.
      Also provide an explanation for the severity level to ensure transparency.

      Consider the following factors:
      - Image: Analyze the image for the size, density, and visual impact of the issue.
      - Location: Use the location to understand the environmental impact of the issue.
      - Confirmation: If the issue is confirmed by the user, it is considered more severe.
      - Issue Type: The type of issue determines what to look for.
        - Pothole: Severity depends on size, depth, and location (e.g., major road vs. side street).
        - Garbage: Severity depends on volume, type of waste (e.g., hazardous), and location (e.g., park vs. alley).
        - Streetlight: Severity is high if it's at a major intersection or a dark, isolated area, otherwise medium or low.
        - Fallen Tree: Severity depends on whether it's blocking a road, sidewalk, or has damaged property. A small branch is low severity.
        - Other: Assess based on visible potential for harm or disruption.

      Here's the information about the issue:
      - Image: {{media url=photoDataUri}}
      - Location: {{{location}}}
      - Confirmation Status: {{{isConfirmed}}}
      - Issue Type: {{{issueType}}}

      Ensure the severity and justification fields are populated correctly according to the Zod schema description.
    `,
});

const assessSeverityFlow = ai.defineFlow(
  {
    name: 'assessSeverityFlow',
    inputSchema: AssessSeverityInputSchema,
    outputSchema: AssessSeverityOutputSchema,
  },
  async input => {
    const {output} = await assessSeverityPrompt(input);
    return output!;
  }
);
