import type { DemoScenario } from '@/types/demo';

export const demoScenarios: DemoScenario[] = [
  {
    id: 'vip-premium',
    name: 'VIP Premium Customer',
    description: 'High-value verified customer with extensive history',
    customerProfile: {
      id: 'cust-vip-001',
      name: 'Victoria Sterling',
      email: 'victoria.sterling@enterprise.com',
      phone: '+1-555-9999',
      company: 'Sterling Enterprises',
      address: '500 Park Avenue, New York, NY 10022',
      isVerified: true,
      tags: [
        { label: 'VIP', color: 'bg-amber-500/20 text-amber-600' },
        { label: 'Platinum', color: 'bg-purple-500/20 text-purple-600' },
        { label: 'Enterprise', color: 'bg-blue-500/20 text-blue-600' },
      ],
    },
    interactionHistory: [
      { taskId: 'vip-1', mediaType: 'voice', ani: '+1-555-9999', direction: 'inbound', duration: 180, timestamp: Date.now() - 86400000, wrapUpCode: 'resolved' },
      { taskId: 'vip-2', mediaType: 'voice', ani: '+1-555-9999', direction: 'outbound', duration: 240, timestamp: Date.now() - 86400000 * 3, wrapUpCode: 'resolved' },
      { taskId: 'vip-3', mediaType: 'email', ani: 'email', direction: 'inbound', duration: 300, timestamp: Date.now() - 86400000 * 7, wrapUpCode: 'info' },
      { taskId: 'vip-4', mediaType: 'voice', ani: '+1-555-9999', direction: 'inbound', duration: 150, timestamp: Date.now() - 86400000 * 14, wrapUpCode: 'resolved' },
    ],
    cadVariables: {
      CustomerType: 'VIP',
      AccountTier: 'Platinum',
      Priority: 'High',
      LTV: '$250,000+',
      Sentiment: 'Positive',
    },
  },
  {
    id: 'frustrated',
    name: 'Frustrated Customer',
    description: 'Multiple recent calls, escalation risk',
    customerProfile: {
      id: 'cust-frust-001',
      name: 'Marcus Thompson',
      email: 'mthompson@email.com',
      phone: '+1-555-8765',
      company: 'Self',
      address: '789 Oak Street, Chicago, IL 60601',
      isVerified: false,
      tags: [
        { label: 'Escalation Risk', color: 'bg-red-500/20 text-red-600' },
        { label: 'Callback Pending', color: 'bg-orange-500/20 text-orange-600' },
      ],
    },
    interactionHistory: [
      { taskId: 'fr-1', mediaType: 'voice', ani: '+1-555-8765', direction: 'inbound', duration: 420, timestamp: Date.now() - 3600000, wrapUpCode: 'callback' },
      { taskId: 'fr-2', mediaType: 'voice', ani: '+1-555-8765', direction: 'inbound', duration: 380, timestamp: Date.now() - 86400000, wrapUpCode: 'escalated' },
      { taskId: 'fr-3', mediaType: 'chat', ani: 'chat', direction: 'inbound', duration: 600, timestamp: Date.now() - 86400000 * 2, wrapUpCode: 'callback' },
    ],
    cadVariables: {
      CustomerType: 'Standard',
      Priority: 'Urgent',
      Sentiment: 'Negative',
      OpenTickets: '3',
      LastIssue: 'Billing Dispute',
    },
  },
  {
    id: 'new-customer',
    name: 'New Customer',
    description: 'First-time contact, minimal history',
    customerProfile: {
      id: 'cust-new-001',
      name: 'Sarah Chen',
      email: 'sarah.chen@newmail.com',
      phone: '+1-555-1234',
      isVerified: false,
      tags: [
        { label: 'New', color: 'bg-green-500/20 text-green-600' },
        { label: 'Prospect', color: 'bg-cyan-500/20 text-cyan-600' },
      ],
    },
    interactionHistory: [],
    cadVariables: {
      CustomerType: 'New',
      Source: 'Website',
      AccountTier: 'Basic',
      Priority: 'Normal',
    },
  },
  {
    id: 'technical-issue',
    name: 'Technical Issue',
    description: 'Tech-savvy customer with product problem',
    customerProfile: {
      id: 'cust-tech-001',
      name: 'David Rodriguez',
      email: 'david.r@techcorp.io',
      phone: '+1-555-4567',
      company: 'TechCorp Solutions',
      address: '1 Innovation Way, San Jose, CA 95110',
      isVerified: true,
      tags: [
        { label: 'Technical', color: 'bg-indigo-500/20 text-indigo-600' },
        { label: 'Enterprise', color: 'bg-blue-500/20 text-blue-600' },
      ],
    },
    interactionHistory: [
      { taskId: 'tech-1', mediaType: 'voice', ani: '+1-555-4567', direction: 'inbound', duration: 900, timestamp: Date.now() - 86400000, wrapUpCode: 'escalated' },
      { taskId: 'tech-2', mediaType: 'email', ani: 'email', direction: 'inbound', duration: 450, timestamp: Date.now() - 86400000 * 3, wrapUpCode: 'info' },
    ],
    cadVariables: {
      CustomerType: 'Enterprise',
      IssueType: 'Technical',
      Product: 'Enterprise Suite',
      Priority: 'High',
      TicketNumber: 'TKT-98765',
    },
  },
  {
    id: 'billing-dispute',
    name: 'Billing Dispute',
    description: 'Payment issue requiring resolution',
    customerProfile: {
      id: 'cust-bill-001',
      name: 'Jennifer Walsh',
      email: 'j.walsh@company.com',
      phone: '+1-555-7890',
      company: 'Walsh & Associates',
      address: '456 Finance Blvd, Boston, MA 02110',
      isVerified: true,
      tags: [
        { label: 'Billing', color: 'bg-yellow-500/20 text-yellow-600' },
        { label: 'Past Due', color: 'bg-red-500/20 text-red-600' },
      ],
    },
    interactionHistory: [
      { taskId: 'bill-1', mediaType: 'voice', ani: '+1-555-7890', direction: 'inbound', duration: 540, timestamp: Date.now() - 86400000 * 2, wrapUpCode: 'callback' },
      { taskId: 'bill-2', mediaType: 'email', ani: 'email', direction: 'outbound', duration: 180, timestamp: Date.now() - 86400000 * 5, wrapUpCode: 'info' },
    ],
    cadVariables: {
      CustomerType: 'Business',
      AccountStatus: 'Past Due',
      DisputeAmount: '$1,250.00',
      Priority: 'High',
      BillingCycle: 'Monthly',
    },
  },
  {
    id: 'callback-request',
    name: 'Callback Request',
    description: 'Scheduled callback pending',
    customerProfile: {
      id: 'cust-cb-001',
      name: 'Robert Kim',
      email: 'rkim@personal.net',
      phone: '+1-555-3456',
      isVerified: true,
      tags: [
        { label: 'Callback', color: 'bg-teal-500/20 text-teal-600' },
        { label: 'Scheduled', color: 'bg-blue-500/20 text-blue-600' },
      ],
    },
    interactionHistory: [
      { taskId: 'cb-1', mediaType: 'voice', ani: '+1-555-3456', direction: 'inbound', duration: 120, timestamp: Date.now() - 7200000, wrapUpCode: 'callback' },
    ],
    cadVariables: {
      CustomerType: 'Standard',
      CallbackRequested: 'true',
      CallbackTime: '2:00 PM',
      Priority: 'Normal',
      Reason: 'Account Review',
    },
  },
];

export function getScenarioById(id: string): DemoScenario | undefined {
  return demoScenarios.find(s => s.id === id);
}
