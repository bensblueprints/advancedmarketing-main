const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { fullName, email, businessName, invoiceNumber, amount } = JSON.parse(event.body);

    // Validate required fields
    if (!fullName || !email || !businessName || !amount) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: fullName, email, businessName, and amount are required.' }),
      };
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 1) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Amount must be at least $1.00.' }),
      };
    }

    // Convert dollars to cents
    const amountInCents = Math.round(amountNum * 100);

    // Build line item description
    let description = `Invoice Payment - ${businessName}`;
    if (invoiceNumber) {
      description = `Invoice #${invoiceNumber} - ${businessName}`;
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email,
      metadata: {
        name: fullName,
        business_name: businessName,
        invoice_number: invoiceNumber || '',
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: description,
              description: `Payment from ${fullName} (${businessName})`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      success_url: 'https://advancedmarketing.co/pay/success.html',
      cancel_url: 'https://advancedmarketing.co/pay/',
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Failed to create checkout session.' }),
    };
  }
};
