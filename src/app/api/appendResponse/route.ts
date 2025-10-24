import { google } from 'googleapis'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    console.log('=== GOOGLE SHEETS API REQUEST START ===')
    console.log('Request body:', JSON.stringify(body, null, 2))
    console.log('Environment check:', {
      hasClientEmail: !!process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      hasSheetId: !!process.env.GOOGLE_SHEET_ID,
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      sheetId: process.env.GOOGLE_SHEET_ID,
      privateKeyLength: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.length || 0,
    })

    if (!process.env.GOOGLE_SHEETS_CLIENT_EMAIL || !process.env.GOOGLE_SHEETS_PRIVATE_KEY || !process.env.GOOGLE_SHEET_ID) {
      throw new Error('Missing required environment variables')
    }

    // Initialize Google Sheets API
    console.log('Creating auth...')
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(
          /\\n/g,
          '\n'
        ),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    console.log('Creating sheets client...')
    const sheets = google.sheets({ version: 'v4', auth })
    
    console.log('Preparing data to append...')
    const rowData = [
      body.timestamp,
      body.municipality,
      body.monthly_income,
      body.adults,
      body.children,
      body.perceived_percentile,
      body.actual_percentile,
      body.equiv_income,
    ]
    console.log('Row data:', rowData)

    // Append to sheet
    console.log('Attempting to append to sheet...')
    const result = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Hoja 1!A:H',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowData],
      },
    })
    
    console.log('Successfully appended to sheet:', result.data)
    console.log('=== GOOGLE SHEETS API REQUEST END ===')

    return NextResponse.json({ success: true, result: result.data })
  } catch (error) {
    console.error('=== ERROR IN GOOGLE SHEETS API ===')
    console.error('Error type:', typeof error)
    console.error('Error constructor:', error?.constructor?.name)
    console.error('Full error:', error)
    
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    // Check if it's a Google API error
    if (error && typeof error === 'object') {
      console.error('Error object keys:', Object.keys(error))
      if ('code' in error) console.error('Error code:', (error as any).code)
      if ('errors' in error) console.error('Error errors:', (error as any).errors)
      if ('response' in error) console.error('Error response:', (error as any).response)
    }
    
    console.error('=== END ERROR LOG ===')
    
    return NextResponse.json(
      { 
        error: 'Failed to save response',
        details: error instanceof Error ? error.message : JSON.stringify(error),
        errorType: error?.constructor?.name || typeof error,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
