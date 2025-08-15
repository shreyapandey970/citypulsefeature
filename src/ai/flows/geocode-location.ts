'use server';

/**
 * @fileOverview A Genkit flow for converting a location name into geographic coordinates.
 *
 * - geocodeLocation - A function that takes a location name and returns its latitude and longitude.
 * - GeocodeLocationInput - The input type for the geocodeLocation function.
 * - GeocodeLocationOutput - The return type for the geocodeLocation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeocodeLocationInputSchema = z.object({
  locationName: z.string().describe('The name of the location to geocode (e.g., "Eiffel Tower", "Mumbai, India").'),
});
export type GeocodeLocationInput = z.infer<typeof GeocodeLocationInputSchema>;

const GeocodeLocationOutputSchema = z.object({
  latitude: z.number().describe('The latitude of the location.'),
  longitude: z.number().describe('The longitude of the location.'),
});
export type GeocodeLocationOutput = z.infer<typeof GeocodeLocationOutputSchema>;

export async function geocodeLocation(input: GeocodeLocationInput): Promise<GeocodeLocationOutput> {
  return geocodeLocationFlow(input);
}

const geocodePrompt = ai.definePrompt({
  name: 'geocodePrompt',
  input: {schema: GeocodeLocationInputSchema},
  output: {schema: GeocodeLocationOutputSchema},
  prompt: `You are a highly accurate geocoding assistant. Your task is to convert the given location name into its precise latitude and longitude.

Location Name: {{{locationName}}}

Respond with only the latitude and longitude in the specified JSON format.
`,
});

const geocodeLocationFlow = ai.defineFlow(
  {
    name: 'geocodeLocationFlow',
    inputSchema: GeocodeLocationInputSchema,
    outputSchema: GeocodeLocationOutputSchema,
  },
  async input => {
    const {output} = await geocodePrompt(input);
    return output!;
  }
);
