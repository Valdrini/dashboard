# Anchorzup Dashboard

A modern, responsive dashboard application built with Angular 18, featuring drag-and-drop widgets, interactive charts, and data export capabilities.

## Features

- Draggable and resizable dashboard widgets using GridStack
- Interactive charts with zoom
- Export data to CSV or PDF formats
- Responsive design for mobile, tablet, and desktop
- Real-time data filtering and sorting
- Customizable layout with save functionality

## Prerequisites

Before you begin, make sure you have installed:

1. **Node.js** (version 18 or higher)
   - Download from: https://nodejs.org/
   - This includes npm (Node Package Manager)
   - To check if installed, open terminal/command prompt and type: `node --version`

2. **Angular CLI** (Command Line Interface)
   - After installing Node.js, open terminal/command prompt
   - Run: `npm install -g @angular/cli`
   - This installs Angular CLI globally on your computer
   - To verify: `ng version`


## Getting Started

Follow these steps to set up and run the project:

### 1. Get the project files

**Option A - Using Git:**
```bash
git clone <your-repository-url>
cd dashboard
```

**Option B - Without Git:**
- Download the ZIP file from GitHub
- Extract it to a folder
- Open terminal/command prompt in that folder

### 2. Install Angular CLI (if you haven't already)

```bash
npm install -g @angular/cli
```

This is a one-time installation. Skip if already installed.

### 3. Install project dependencies

```bash
npm install
```

This installs all required packages:
-Bootstrap 5 (npm install bootstrap)
-Chart.js and chartjs-plugin-zoom (npm install chart.js chartjs-plugin-zoom)
-GridStack (npm install gridstack)
-jsPDF and jspdf-autotable (npm install jspdf jspdf-autotable)

### 4. Run the development server

```bash
npm start
```

Or alternatively:

```bash
ng serve
```

