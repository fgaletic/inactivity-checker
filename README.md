

# Inactivity Checker Middleware (Starter Project)

This Node.js middleware tool helps automate the process of monitoring user inactivity and triggering actions such as notifications, tag updates, and CRM integrations. Out of the box, it supports GoHighLevel and Pike13, but its modular design makes it easy to adapt for other CRMs or business platforms.

The project is intended as a starter template for developers and businesses who want to build custom inactivity workflows, automate retention efforts, or connect with multiple external services. You can expand or modify the logic to suit your own requirements.



## Features

- Checks for inactive users based on customizable logic
- Sends email notifications if a contact exists
- Removes inactive tags when users become active
- Integrates with GoHighLevel CRM (can be adapted for Pike13 and other CRMs)
- Scheduled tasks for regular inactivity checks
- API endpoints for widget and external integrations



## File Overview

- `api.js`: API endpoints for widget and external integrations
- `index.js`: Main entry point
- `locations.js`: Location-related logic
- `logic.js`: Core inactivity checking logic
- `removeInactiveTagIfActive.js`: Removes inactive tag if user is active
- `scheduler.js`: Schedules regular inactivity checks
- `sendEmailIfContactExists.js`: Sends email notifications
- `sendToGoHighLevel.js`: Integrates with GoHighLevel CRM (can be extended for other CRMs)
- `server.js`: Express server setup
- `token.json`: Stores authentication tokens
- `widget.html`: Frontend widget



## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment:**
   - Add necessary environment variables (API keys, CRM credentials, email settings, etc.)
   - Update `token.json` with authentication tokens

3. **Run the application:**

   ```bash
   node index.js
   ```



## Usage

- Access the API endpoints via the configured server port
- Integrate the widget using `widget.html`
- Scheduled tasks run automatically based on configuration in `scheduler.js`



## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.



## License

MIT
