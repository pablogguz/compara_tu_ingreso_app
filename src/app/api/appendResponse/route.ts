import { google } from 'googleapis'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    console.log('Received request to append to sheet')
    console.log('Environment check:', {
      hasClientEmail: !!process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      hasSheetId: !!process.env.GOOGLE_SHEET_ID,
      clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      sheetId: process.env.GOOGLE_SHEET_ID,
    })

    // Initialize Google Sheets API
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

    const sheets = google.sheets({ version: 'v4', auth })
    
    console.log('Attempting to append to sheet...')

    // Append to sheet
    const result = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Hoja 1!A:H', // Adjust sheet name if needed
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          [
            body.timestamp,
            body.municipality,
            body.monthly_income,
            body.adults,
            body.children,
            body.perceived_percentile,
            body.actual_percentile,
            body.equiv_income,
          ],
        ],
      },
    })
    
    console.log('Successfully appended to sheet:', result.data)

    return NextResponse.json({ success: true, result: result.data })
  } catch (error) {
    console.error('Error appending to sheet:', error)
    return NextResponse.json(
      { 
        error: 'Failed to save response',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
