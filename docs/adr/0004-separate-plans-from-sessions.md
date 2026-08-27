# Separate planned blocks from actual sessions

CoreHour stores planned blocks separately from actual sessions because intention must never silently become tracked time or affect Insights. A plan may overlap other plans or sessions, and only an explicit Plan Conversion creates and links an actual session using the existing session validation transaction.
