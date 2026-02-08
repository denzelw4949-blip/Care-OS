import express from 'express';
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Simple Server is Running!'));
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.post('/webhooks/slack/events', (req, res) => {
    console.log('Slack event received:', req.body);
    res.status(200).send(req.body.challenge);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Simple Server running on port ${PORT}`);
});
