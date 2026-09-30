// The years the essay talks about. They must match the pipeline in methodology/code/0d. nowcast.r
// (tests/years.test.ts checks): the ADRH cross-section and the year it is nowcast to, which is the
// year whose income we ask for.
export const ADRH_YEAR = 2023
export const INCOME_YEAR = 2025
// The municipal context from the INE annual population census (1 January), set in
// methodology/code/3a. mun_stats.r: education of those aged 15+ and place of birth.
export const EDUCATION_YEAR = 2024
export const BIRTHPLACE_YEAR = 2025
