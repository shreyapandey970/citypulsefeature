import { config } from 'dotenv';
config();

import '@/ai/flows/identify-object.ts';
import '@/ai/flows/assess-severity.ts';
import '@/ai/flows/geocode-location.ts';
