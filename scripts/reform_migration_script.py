# %%
import requests
import csv
import json
from datetime import datetime




def upload_to_supabase(data, APIURL):
   APIKEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lY3JrZWFuYXpkeG93amNwanFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY4NDE5NTkwMiwiZXhwIjoxOTk5NzcxOTAyfQ.vbfQO5YBPkpoQHJzGJ0jfLOVN2RvEzh9BIYLnZ3to7A'
   headers = {
       'apikey': APIKEY,
       'Authorization': f'Bearer {APIKEY}',
       'Content-Type': 'application/json',
       'Prefer': 'return=representation'
    }
   for row in data:
       payload = json.dumps(row)
       response = requests.post(APIURL, headers=headers, data=payload, timeout=120)
       print(response.text)


def fetchnprocess_csv_city(url):
   csv_url = url
   resp = requests.get(csv_url)
#make sure fetched ok
   if resp.status_code == 200:
       csv_content = resp.content.decode('utf-8')
       rows = csv_content.strip().split('\n')
       csv_reader = csv.reader(rows)


       header = next(csv_reader)
       recent_index = header.index('Recent')
       notable_index = header.index('Notable')
       pop_index = header.index('Population')
       time_index = header.index('Updated')
      
       processed_rows = []
       for idx, row in enumerate(csv_reader):
           row = list(map(str.strip, row))
           recent_value = row[recent_index].strip()
           notable_value = row[notable_index].strip()
           if recent_value == '':
               row[recent_index] = 'false'
           if notable_value == '':
               row[notable_index] = 'false'
           row[pop_index]= int(row[pop_index].replace(',',''))
           parsed_timestamp = datetime.strptime(row[time_index], "%B %d, %Y, %I:%M:%S %p %Z")
           formatted_timestamp = parsed_timestamp.strftime("%Y-%m-%d %H:%M:%S %Z")
           row[time_index] = formatted_timestamp
           processed_rows.append(dict(zip(header, row)))
       return processed_rows
   else:
       print("Failed :/")

def fetchnprocess_csv_report(url):
    csv_url = url
    resp = requests.get(csv_url)

    if resp.status_code == 200:
        csv_content = resp.content.decode('utf-8')
        rows = csv_content.strip().split('\n')
        csv_reader = csv.reader(rows)

        header = next(csv_reader)

        pop_index = header.index('Population')
        time1_index = header.index('Last updated')
        time2_index = header.index('Create Time')
        time3_index = header.index('City Last Updated')
        date_of_reform_index = header.index('Date of Reform')


        processed_rows = []
        for idx, row in enumerate(csv_reader):
            row[pop_index]= int(row[pop_index].replace(',',''))

            time_indexes = [time1_index, time2_index, time3_index]

            for index in time_indexes:
                parsed_timestamp = datetime.strptime(row[index], "%B %d, %Y, %I:%M:%S %p %Z")
                formatted_timestamp = parsed_timestamp.strftime("%Y-%m-%d %H:%M:%S %Z")
                row[index] = formatted_timestamp
            
            if row[date_of_reform_index].strip() != '':
                reform_date = datetime.strptime(row[date_of_reform_index], "%b %d, %Y")
                reform_date_str = reform_date.strftime("%m\%d\%Y")
                row[date_of_reform_index] = reform_date_str
            processed_row = {
                header[i]: value for i, value in enumerate(row) if i != date_of_reform_index
            }
            processed_rows.append(processed_row)
            # processed_rows.append(dict(zip(header, row)))
        return processed_rows
    else:
        print("Failed :/")


def fetchnprocess_csv_citation(url):
    csv_url = url
    resp = requests.get(csv_url)

    if resp.status_code == 200:
        csv_content = resp.content.decode('utf-8')
        rows = csv_content.strip().split('\n')
        csv_reader = csv.reader(rows)

        header = next(csv_reader)

        time1_index = header.index('Last updated')
        time2_index = header.index('Create Time')
        time3_index = header.index('Report Last updated')
        time4_index = header.index('City Last Updated')


        processed_rows = []
        for idx, row in enumerate(csv_reader):

            time_indexes = [time1_index, time2_index, time3_index, time4_index]

            for index in time_indexes:
                parsed_timestamp = datetime.strptime(row[index], "%B %d, %Y, %I:%M:%S %p %Z")
                formatted_timestamp = parsed_timestamp.strftime("%Y-%m-%d %H:%M:%S %Z")
                row[index] = formatted_timestamp
            
            processed_rows.append(dict(zip(header, row)))
        return processed_rows
    else:
        print("Failed :/")
def fetchnprocess_csv_contact(url):
   csv_url = url
   resp = requests.get(csv_url)
#make sure fetched ok
   if resp.status_code == 200:
       csv_content = resp.content.decode('utf-8')
       rows = csv_content.strip().split('\n')
       csv_reader = csv.reader(rows)


       header = next(csv_reader)
       time_index = header.index('Last updated')
      
       processed_rows = []
       for idx, row in enumerate(csv_reader):
           row = list(map(str.strip, row))
           parsed_timestamp = datetime.strptime(row[time_index], "%B %d, %Y, %I:%M:%S %p %Z")
           formatted_timestamp = parsed_timestamp.strftime("%Y-%m-%d %H:%M:%S %Z")
           row[time_index] = formatted_timestamp
           processed_rows.append(dict(zip(header, row)))
       return processed_rows
   else:
       print("Failed :/")

def fetchnprocess_csv_add(url):
   csv_url = url
   resp = requests.get(csv_url)
#make sure fetched ok
   if resp.status_code == 200:
       csv_content = resp.content.decode('utf-8')
       rows = csv_content.strip().split('\n')
       csv_reader = csv.reader(rows)


       header = next(csv_reader)
       pop_index = header.index('population')
      
       processed_rows = []
       for idx, row in enumerate(csv_reader):
           row = list(map(str.strip, row))
           row[pop_index]= int(row[pop_index].replace(',',''))
           processed_rows.append(dict(zip(header, row)))
       return processed_rows
   else:
       print("Failed :/")

# %%
city_APIURL = 'https://oecrkeanazdxowjcpjqr.supabase.co/rest/v1/City'
city_csv_url = "https://area120tables.googleapis.com/link/aR_AWTAZ6WF8_ZB3HgfOvN/export?key=8-SifuDc4Fg7purFrntOa7bjE0ikjGAy28t36wUBIOJx9vFGZuSR89N1PkSTFXpOk6"

city_processed_data = fetchnprocess_csv_city(city_csv_url)
upload_to_supabase(city_processed_data, city_APIURL)

# %% [markdown]
# 

# %%
report_APIURL = 'https://oecrkeanazdxowjcpjqr.supabase.co/rest/v1/Report'
report_csv_url = 'https://area120tables.googleapis.com/link/bAc5xhhLJ2q4jYYGjaq_24/export?key=8_S1APcQHGN9zfTXEMz_Gz8sel3FCo3RUfEV4f-PBOqE8zy3vG3FpCQcSXQjRDXOqZ'

report_processed_data = fetchnprocess_csv_report(report_csv_url)
upload_to_supabase(report_processed_data, report_APIURL)

# %%


# %%
citation_APIURL = 'https://oecrkeanazdxowjcpjqr.supabase.co/rest/v1/Citation'
citation_csv_url = 'https://area120tables.googleapis.com/link/aUJhBkwwY9j1NpD-Enh4WU/export?key=aasll5u2e8Xf-jxNNGlk3vbnOYcDsJn-JbgeI3z6IkPk8z5CxpWOLEp5EXd8iMF_bc'

citation_processed_data = fetchnprocess_csv_citation(citation_csv_url)
#citation_processed_data
upload_to_supabase(citation_processed_data, citation_APIURL)

# %%
contact_APIURL = 'https://oecrkeanazdxowjcpjqr.supabase.co/rest/v1/Contact'
contact_csv_url = 'https://area120tables.googleapis.com/link/9yPvvVQT8vbbbmal5Oc4I6/export?key=8VZHmPJawsY3T39bP2t4nL9Q7_dfkZR5g6wMCY1fOOswaEJMLQ4jEwF6sFsaB5SkfJ'

contact_processed_data = fetchnprocess_csv_contact(contact_csv_url)
upload_to_supabase(contact_processed_data, contact_APIURL)

# %%
add_APIURL = 'https://oecrkeanazdxowjcpjqr.supabase.co/rest/v1/Add'
add_csv_url = 'https://area120tables.googleapis.com/link/b7V17_h5rK31MPfqJs3O1U/export?key=99swTJlSNaAdVjrr85C4p6bTAniveVyZ-2kblY7Hc4nc8yE_7H5cMMma5P1TLzukV0'

add_processed_data = fetchnprocess_csv_add(add_csv_url)
upload_to_supabase(add_processed_data, add_APIURL)

# %%



