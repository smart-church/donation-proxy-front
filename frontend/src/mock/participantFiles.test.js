import * as XLSX from 'xlsx';
import { participantToApi, participantToView } from './api';

test('file answers use stable field IDs; editing excludes files and export contains only names', () => {
  const fields = [{ id: 1, type: 'full_name' }, { id: 2, type: 'email' }, { id: 3, type: 'file', title: 'Документ' }, { id: 4, type: 'file', title: 'Документ' }];
  const participant = participantToView({ full_name: 'Ivan', email: 'i@example.com', status: 'New', fields: [],
    file_answers: [ { field_id: 3, files: [{ file_id: 'secret-id', name: '=1+1.pdf', url: '/private' }] },
      { field_id: 4, files: [{ file_id: 'other-id', name: 'second.docx' }] } ],
  }, fields);
  expect(participant.answers[3]).toEqual(['=1+1.pdf']); expect(participant.answers[4]).toEqual(['second.docx']);
  expect(participantToApi(participant, fields).fields).toEqual([]);
  const sheet = XLSX.utils.json_to_sheet([{ 'Документ (#3)': participant.answers[3].join(', '), 'Документ (#4)': participant.answers[4].join(', ') }]);
  expect(sheet.A2.v).toBe('=1+1.pdf'); expect(sheet.A2.t).toBe('s'); expect(sheet.A2.f).toBeUndefined();
  expect(sheet.B2.v).toBe('second.docx'); expect(JSON.stringify(sheet)).not.toContain('secret-id');
});
