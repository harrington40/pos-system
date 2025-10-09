# MoMo Transfer App - Development Instructions

## Project Overview
This is a modern React-based money transfer application that integrates with the MTN MoMo API. The application is designed for web, mobile web, and iOS platforms with a focus on modern design aesthetics and smooth user experience.

## Tech Stack
- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom components
- **Animations**: Framer Motion
- **Routing**: React Router DOM
- **Forms**: React Hook Form
- **Notifications**: React Hot Toast
- **Icons**: Lucide React
- **API Integration**: MTN MoMo API with Axios

## Project Structure
- `/src/components/` - Reusable UI components (Navigation, LoadingSpinner, Toast)
- `/src/pages/` - Main application pages (Dashboard, SendMoney, ReceiveMoney, TransactionHistory, Profile)
- `/src/services/` - API integration services (MTN MoMo API)
- `/src/types/` - TypeScript type definitions

## Key Features
- **Dashboard**: Balance overview, quick actions, recent transactions
- **Send Money**: Multi-step money transfer flow with confirmation
- **Receive Money**: Payment request system with QR codes and shareable links
- **Transaction History**: Searchable and filterable transaction listing
- **Profile**: User management and app settings
- **Responsive Design**: Mobile-first design with desktop optimization
- **Modern Animations**: Smooth transitions and micro-interactions
- **Real-time Notifications**: Enhanced toast notification system

## Development Setup
1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Build for production: `npm run build`
4. Preview production build: `npm run preview`

## API Integration
The app uses the MTN MoMo API for payment processing. Currently configured with mock responses for development. Update the API configuration in `/src/services/momoApi.ts` for production use.

## Design System
- **Colors**: Blue/Indigo primary palette with yellow accent
- **Typography**: Modern, clean font hierarchy
- **Components**: Reusable button, input, and card components
- **Animations**: Framer Motion for smooth transitions
- **Mobile Navigation**: Bottom tab bar for mobile, top navigation for desktop

## Completed Features
✅ Project scaffolding and setup
✅ Core component implementation
✅ MTN MoMo API integration
✅ Responsive design system
✅ Modern animations and transitions
✅ Enhanced navigation with mobile/desktop layouts
✅ Complete money transfer workflow
✅ Transaction history and filtering
✅ User profile management
✅ Loading states and error handling
✅ Toast notification system