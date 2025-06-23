import axios from 'axios';
import { WebhookClient } from 'discord.js';

/**
 * Notification service for deployment events
 */
export class NotificationService {
  private slackWebhookUrl: string;
  private discordWebhookUrl: string;
  private environment: string;
  
  constructor(environment: string = 'development') {
    this.slackWebhookUrl = process.env.SLACK_WEBHOOK_URL || '';
    this.discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL || '';
    this.environment = environment;
  }
  
  /**
   * Send deployment notification to Slack
   */
  async sendSlackDeploymentNotification(
    status: 'started' | 'success' | 'failed',
    version: string,
    details: string
  ): Promise<void> {
    if (!this.slackWebhookUrl) {
      console.log('Slack webhook URL not configured');
      return;
    }
    
    const color = status === 'success' ? '#36a64f' : status === 'failed' ? '#d00000' : '#ffcc00';
    
    try {
      await axios.post(this.slackWebhookUrl, {
        attachments: [
          {
            color,
            pretext: `Deployment ${status} for Mining Marketplace`,
            title: `${this.environment.toUpperCase()} Deployment ${status === 'started' ? 'Initiated' : status === 'success' ? 'Successful' : 'Failed'}`,
            text: details,
            fields: [
              {
                title: 'Environment',
                value: this.environment,
                short: true
              },
              {
                title: 'Version',
                value: version,
                short: true
              },
              {
                title: 'Status',
                value: status.charAt(0).toUpperCase() + status.slice(1),
                short: true
              },
              {
                title: 'Time',
                value: new Date().toISOString(),
                short: true
              }
            ],
            footer: 'Mining Marketplace CI/CD Pipeline'
          }
        ]
      });
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
    }
  }
  
  /**
   * Send deployment notification to Discord
   */
  async sendDiscordDeploymentNotification(
    status: 'started' | 'success' | 'failed',
    version: string,
    details: string
  ): Promise<void> {
    if (!this.discordWebhookUrl) {
      console.log('Discord webhook URL not configured');
      return;
    }
    
    const color = status === 'success' ? 0x36a64f : status === 'failed' ? 0xd00000 : 0xffcc00;
    
    try {
      const webhookClient = new WebhookClient({ url: this.discordWebhookUrl });
      
      await webhookClient.send({
        embeds: [
          {
            color,
            title: `${this.environment.toUpperCase()} Deployment ${status === 'started' ? 'Initiated' : status === 'success' ? 'Successful' : 'Failed'}`,
            description: details,
            fields: [
              {
                name: 'Environment',
                value: this.environment,
                inline: true
              },
              {
                name: 'Version',
                value: version,
                inline: true
              },
              {
                name: 'Status',
                value: status.charAt(0).toUpperCase() + status.slice(1),
                inline: true
              },
              {
                name: 'Time',
                value: new Date().toISOString(),
                inline: true
              }
            ],
            timestamp: new Date().toISOString(),
            footer: {
              text: 'Mining Marketplace CI/CD Pipeline'
            }
          }
        ]
      });
    } catch (error) {
      console.error('Failed to send Discord notification:', error);
    }
  }
  
  /**
   * Send error notification
   */
  async sendErrorNotification(
    errorType: string,
    errorMessage: string,
    errorDetails: string
  ): Promise<void> {
    // Send to Slack
    if (this.slackWebhookUrl) {
      try {
        await axios.post(this.slackWebhookUrl, {
          attachments: [
            {
              color: '#d00000',
              pretext: `⚠️ Error Alert: ${errorType}`,
              title: errorMessage,
              text: errorDetails,
              fields: [
                {
                  title: 'Environment',
                  value: this.environment,
                  short: true
                },
                {
                  title: 'Time',
                  value: new Date().toISOString(),
                  short: true
                }
              ],
              footer: 'Mining Marketplace Error Monitoring'
            }
          ]
        });
      } catch (error) {
        console.error('Failed to send Slack error notification:', error);
      }
    }
    
    // Send to Discord
    if (this.discordWebhookUrl) {
      try {
        const webhookClient = new WebhookClient({ url: this.discordWebhookUrl });
        
        await webhookClient.send({
          embeds: [
            {
              color: 0xd00000,
              title: `⚠️ Error Alert: ${errorType}`,
              description: errorMessage,
              fields: [
                {
                  name: 'Details',
                  value: errorDetails
                },
                {
                  name: 'Environment',
                  value: this.environment,
                  inline: true
                },
                {
                  name: 'Time',
                  value: new Date().toISOString(),
                  inline: true
                }
              ],
              timestamp: new Date().toISOString(),
              footer: {
                text: 'Mining Marketplace Error Monitoring'
              }
            }
          ]
        });
      } catch (error) {
        console.error('Failed to send Discord error notification:', error);
      }
    }
  }
}
