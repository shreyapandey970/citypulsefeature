# **App Name**: EnviroCheck

## Core Features:

- Location Acquisition: Acquire the user's location automatically using the device's GPS or allow manual entry.
- Image Upload: Accept image input from the user via camera or image gallery.
- Object Recognition: Employ a tool to process the image to identify potholes and garbage, returning a confidence score.
- Complaint Confirmation: Request confirmation from the user about the complaint (pothole/garbage) via a simple confirmation screen.
- Severity Assessment: Using location, image and confirmation as input, calculate the severity of the complaint as High, Medium, or Low, considering the type, size, density and environmental impact of the confirmed report.
- Confirmation Display: Visually communicate the complaint status to the user (pending, verified).

## Style Guidelines:

- Primary color: A natural green (#8FBC8F) to convey environmental awareness.
- Background color: Off-white (#F5F5DC), a light, desaturated tint of the primary green, to give the app a clean, organic feel.
- Accent color: A desaturated orange (#E9967A) to draw attention to key interactive elements, analogous to the green, yet distinct.
- Font pairing: 'Space Grotesk' (sans-serif) for headlines, matched with 'Inter' (sans-serif) for body text.
- Use clear and simple icons, using an open-source icon library like FontAwesome.
- Employ a user-friendly layout, suitable for mobile, which should prioritize the map and complaint details.
- Subtle animations when updating the report status.