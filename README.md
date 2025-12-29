# Gepperdy

A modern Next.js web application with a RESTful API backend, built with TypeScript and Tailwind CSS.

## 🚀 Features

- ⚡️ **Next.js 15** with App Router
- 🎨 **Tailwind CSS** for beautiful, responsive UI
- 📝 **TypeScript** for type-safe code
- 🔌 **RESTful API** with full CRUD operations
- 🌓 **Dark mode** support
- 📱 **Fully responsive** design
- ✨ **Modern UI/UX** with smooth animations

## 📋 Tech Stack

- **Framework:** Next.js 15
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **API:** Next.js Route Handlers
- **Linting:** ESLint

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+ installed on your machine
- npm, yarn, pnpm, or bun package manager

### Installation

1. Navigate to the project directory:
```bash
cd gepperdy
```

2. Install dependencies (already done):
```bash
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

The application features:
- Interactive user management dashboard
- Real-time API testing
- Beautiful gradient UI with Tailwind CSS
- Dark mode support

### Build for Production

```bash
npm run build
npm start
```

## 📚 API Documentation

The application includes a complete RESTful API. See [API_DOCS.md](./API_DOCS.md) for detailed documentation.

### Quick API Overview

- `GET /api/hello` - Test endpoint
- `GET /api/users` - Get all users
- `POST /api/users` - Create a user
- `GET /api/users/[id]` - Get user by ID
- `PUT /api/users/[id]` - Update user by ID
- `DELETE /api/users/[id]` - Delete user by ID

### Using the API Client

The app includes a type-safe API client in `lib/api.ts`:

```typescript
import { userApi } from '@/lib/api';

// Get all users
const response = await userApi.getAll();

// Create a user
await userApi.create({
  name: 'John Doe',
  email: 'john@example.com'
});
```

## 📁 Project Structure

```
gepperdy/
├── app/
│   ├── api/              # API routes
│   │   ├── hello/        # Test endpoint
│   │   └── users/        # User CRUD endpoints
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page with dashboard
│   └── globals.css       # Global styles
├── lib/
│   └── api.ts            # API client utilities
├── public/               # Static assets
├── middleware.ts         # API middleware (CORS)
├── API_DOCS.md          # API documentation
└── README.md            # This file
```

## 🎨 Customization

### Styling

The app uses Tailwind CSS. Customize the theme in `tailwind.config.ts`:

```typescript
export default {
  theme: {
    extend: {
      colors: {
        // Add your custom colors
      }
    }
  }
}
```

### API Backend

Currently using in-memory storage. To use a real database:

1. Install your database client (e.g., Prisma, MongoDB driver)
2. Update the API routes in `app/api/`
3. Replace the in-memory arrays with database queries

### Example with Prisma:

```typescript
// app/api/users/route.ts
import { prisma } from '@/lib/prisma';

export async function GET() {
  const users = await prisma.user.findMany();
  return NextResponse.json({ success: true, data: users });
}
```

## 🚢 Deployment

### Deploy on Vercel

The easiest way to deploy:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push your code to GitHub
2. Import your repository in Vercel
3. Deploy!

### Other Platforms

This app can be deployed on any platform that supports Next.js:
- Netlify
- AWS Amplify
- Railway
- Render
- Digital Ocean

## 📝 License

MIT License - feel free to use this project for learning or production!

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📖 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

---

Built with ❤️ using Next.js and Tailwind CSS
