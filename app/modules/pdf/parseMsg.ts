/* eslint-disable @typescript-eslint/no-explicit-any */
/*
Gebaseerd op: https://github.com/master131/msg2eml.js/blob/master/README.md
*/

import { decompressRTF } from '@kenjiuno/decompressrtf'
import bigInt from 'big-integer'
import CFB from 'cfb'
import * as iconvLite from 'iconv-lite'
import mime from 'mime-types'
import { deEncapsulateSync } from 'rtf-stream-parser'


const propertyTags = new Array(0x3f08 + 1)
propertyTags[0x01] = ['ACKNOWLEDGEMENT_MODE', 'I4']
propertyTags[0x02] = ['ALTERNATE_RECIPIENT_ALLOWED', 'BOOLEAN']
propertyTags[0x03] = ['AUTHORIZING_USERS', 'BINARY']
// Comment on an automatically forwarded message
propertyTags[0x04] = ['AUTO_FORWARD_COMMENT', 'STRING']
// Whether a message has been automatically forwarded
propertyTags[0x05] = ['AUTO_FORWARDED', 'BOOLEAN']
propertyTags[0x06] = ['CONTENT_CONFIDENTIALITY_ALGORITHM_ID', 'BINARY']
propertyTags[0x07] = ['CONTENT_CORRELATOR', 'BINARY']
propertyTags[0x08] = ['CONTENT_IDENTIFIER', 'STRING']
// MIME content length
propertyTags[0x09] = ['CONTENT_LENGTH', 'I4']
propertyTags[0x0a] = ['CONTENT_RETURN_REQUESTED', 'BOOLEAN']
propertyTags[0x0b] = ['CONVERSATION_KEY', 'BINARY']
propertyTags[0x0c] = ['CONVERSION_EITS', 'BINARY']
propertyTags[0x0d] = ['CONVERSION_WITH_LOSS_PROHIBITED', 'BOOLEAN']
propertyTags[0x0e] = ['CONVERTED_EITS', 'BINARY']
// Time to deliver for delayed delivery messages
propertyTags[0x0f] = ['DEFERRED_DELIVERY_TIME', 'SYSTIME']
propertyTags[0x10] = ['DELIVER_TIME', 'SYSTIME']
// Reason a message was discarded
propertyTags[0x11] = ['DISCARD_REASON', 'I4']
propertyTags[0x12] = ['DISCLOSURE_OF_RECIPIENTS', 'BOOLEAN']
propertyTags[0x13] = ['DL_EXPANSION_HISTORY', 'BINARY']
propertyTags[0x14] = ['DL_EXPANSION_PROHIBITED', 'BOOLEAN']
propertyTags[0x15] = ['EXPIRY_TIME', 'SYSTIME']
propertyTags[0x16] = ['IMPLICIT_CONVERSION_PROHIBITED', 'BOOLEAN']
// Message importance
propertyTags[0x17] = ['IMPORTANCE', 'I4']
propertyTags[0x18] = ['IPM_ID', 'BINARY']
propertyTags[0x19] = ['LATEST_DELIVERY_TIME', 'SYSTIME']
propertyTags[0x1a] = ['MESSAGE_CLASS', 'STRING']
propertyTags[0x1b] = ['MESSAGE_DELIVERY_ID', 'BINARY']
propertyTags[0x1e] = ['MESSAGE_SECURITY_LABEL', 'BINARY']
propertyTags[0x1f] = ['OBSOLETED_IPMS', 'BINARY']
// Person a message was originally for
propertyTags[0x20] = ['ORIGINALLY_INTENDED_RECIPIENT_NAME', 'BINARY']
propertyTags[0x21] = ['ORIGINAL_EITS', 'BINARY']
propertyTags[0x22] = ['ORIGINATOR_CERTIFICATE', 'BINARY']
propertyTags[0x23] = ['ORIGINATOR_DELIVERY_REPORT_REQUESTED', 'BOOLEAN']
// Address of the message sender
propertyTags[0x24] = ['ORIGINATOR_RETURN_ADDRESS', 'BINARY']
propertyTags[0x25] = ['PARENT_KEY', 'BINARY']
propertyTags[0x26] = ['PRIORITY', 'I4']
propertyTags[0x27] = ['ORIGIN_CHECK', 'BINARY']
propertyTags[0x28] = ['PROOF_OF_SUBMISSION_REQUESTED', 'BOOLEAN']
// Whether a read receipt is desired
propertyTags[0x29] = ['READ_RECEIPT_REQUESTED', 'BOOLEAN']
// Time a message was received
propertyTags[0x2a] = ['RECEIPT_TIME', 'SYSTIME']
propertyTags[0x2b] = ['RECIPIENT_REASSIGNMENT_PROHIBITED', 'BOOLEAN']
propertyTags[0x2c] = ['REDIRECTION_HISTORY', 'BINARY']
propertyTags[0x2d] = ['RELATED_IPMS', 'BINARY']
// Sensitivity of the original message
propertyTags[0x2e] = ['ORIGINAL_SENSITIVITY', 'I4']
propertyTags[0x2f] = ['LANGUAGES', 'STRING']
propertyTags[0x30] = ['REPLY_TIME', 'SYSTIME']
propertyTags[0x31] = ['REPORT_TAG', 'BINARY']
propertyTags[0x32] = ['REPORT_TIME', 'SYSTIME']
propertyTags[0x33] = ['RETURNED_IPM', 'BOOLEAN']
propertyTags[0x34] = ['SECURITY', 'I4']
propertyTags[0x35] = ['INCOMPLETE_COPY', 'BOOLEAN']
propertyTags[0x36] = ['SENSITIVITY', 'I4']
// The message subject
propertyTags[0x37] = ['SUBJECT', 'STRING']
propertyTags[0x38] = ['SUBJECT_IPM', 'BINARY']
propertyTags[0x39] = ['CLIENT_SUBMIT_TIME', 'SYSTIME']
propertyTags[0x3a] = ['REPORT_NAME', 'STRING']
propertyTags[0x3b] = ['SENT_REPRESENTING_SEARCH_KEY', 'BINARY']
propertyTags[0x3c] = ['X400_CONTENT_TYPE', 'BINARY']
propertyTags[0x3d] = ['SUBJECT_PREFIX', 'STRING']
propertyTags[0x3e] = ['NON_RECEIPT_REASON', 'I4']
propertyTags[0x3f] = ['RECEIVED_BY_ENTRYID', 'BINARY']
// Received by: entry
propertyTags[0x40] = ['RECEIVED_BY_NAME', 'STRING']
propertyTags[0x41] = ['SENT_REPRESENTING_ENTRYID', 'BINARY']
propertyTags[0x42] = ['SENT_REPRESENTING_NAME', 'STRING']
propertyTags[0x43] = ['RCVD_REPRESENTING_ENTRYID', 'BINARY']
propertyTags[0x44] = ['RCVD_REPRESENTING_NAME', 'STRING']
propertyTags[0x45] = ['REPORT_ENTRYID', 'BINARY']
propertyTags[0x46] = ['READ_RECEIPT_ENTRYID', 'BINARY']
propertyTags[0x47] = ['MESSAGE_SUBMISSION_ID', 'BINARY']
propertyTags[0x48] = ['PROVIDER_SUBMIT_TIME', 'SYSTIME']
// Subject of the original message
propertyTags[0x49] = ['ORIGINAL_SUBJECT', 'STRING']
propertyTags[0x4a] = ['DISC_VAL', 'BOOLEAN']
propertyTags[0x4b] = ['ORIG_MESSAGE_CLASS', 'STRING']
propertyTags[0x4c] = ['ORIGINAL_AUTHOR_ENTRYID', 'BINARY']
// Author of the original message
propertyTags[0x4d] = ['ORIGINAL_AUTHOR_NAME', 'STRING']
// Time the original message was submitted
propertyTags[0x4e] = ['ORIGINAL_SUBMIT_TIME', 'SYSTIME']
propertyTags[0x4f] = ['REPLY_RECIPIENT_ENTRIES', 'BINARY']
propertyTags[0x50] = ['REPLY_RECIPIENT_NAMES', 'STRING']
propertyTags[0x51] = ['RECEIVED_BY_SEARCH_KEY', 'BINARY']
propertyTags[0x52] = ['RCVD_REPRESENTING_SEARCH_KEY', 'BINARY']
propertyTags[0x53] = ['READ_RECEIPT_SEARCH_KEY', 'BINARY']
propertyTags[0x54] = ['REPORT_SEARCH_KEY', 'BINARY']
propertyTags[0x55] = ['ORIGINAL_DELIVERY_TIME', 'SYSTIME']
propertyTags[0x56] = ['ORIGINAL_AUTHOR_SEARCH_KEY', 'BINARY']
propertyTags[0x57] = ['MESSAGE_TO_ME', 'BOOLEAN']
propertyTags[0x58] = ['MESSAGE_CC_ME', 'BOOLEAN']
propertyTags[0x59] = ['MESSAGE_RECIP_ME', 'BOOLEAN']
// Sender of the original message
propertyTags[0x5a] = ['ORIGINAL_SENDER_NAME', 'STRING']
propertyTags[0x5b] = ['ORIGINAL_SENDER_ENTRYID', 'BINARY']
propertyTags[0x5c] = ['ORIGINAL_SENDER_SEARCH_KEY', 'BINARY']
propertyTags[0x5d] = ['ORIGINAL_SENT_REPRESENTING_NAME', 'STRING']
propertyTags[0x5e] = ['ORIGINAL_SENT_REPRESENTING_ENTRYID', 'BINARY']
propertyTags[0x5f] = ['ORIGINAL_SENT_REPRESENTING_SEARCH_KEY', 'BINARY']
propertyTags[0x60] = ['START_DATE', 'SYSTIME']
propertyTags[0x61] = ['END_DATE', 'SYSTIME']
propertyTags[0x62] = ['OWNER_APPT_ID', 'I4']
// Whether a response to the message is desired
propertyTags[0x63] = ['RESPONSE_REQUESTED', 'BOOLEAN']
propertyTags[0x64] = ['SENT_REPRESENTING_ADDRTYPE', 'STRING']
propertyTags[0x65] = ['SENT_REPRESENTING_EMAIL_ADDRESS', 'STRING']
propertyTags[0x66] = ['ORIGINAL_SENDER_ADDRTYPE', 'STRING']
// Email of the original message sender
propertyTags[0x67] = ['ORIGINAL_SENDER_EMAIL_ADDRESS', 'STRING']
propertyTags[0x68] = ['ORIGINAL_SENT_REPRESENTING_ADDRTYPE', 'STRING']
propertyTags[0x69] = ['ORIGINAL_SENT_REPRESENTING_EMAIL_ADDRESS', 'STRING']
propertyTags[0x70] = ['CONVERSATION_TOPIC', 'STRING']
propertyTags[0x71] = ['CONVERSATION_INDEX', 'BINARY']
propertyTags[0x72] = ['ORIGINAL_DISPLAY_BCC', 'STRING']
propertyTags[0x73] = ['ORIGINAL_DISPLAY_CC', 'STRING']
propertyTags[0x74] = ['ORIGINAL_DISPLAY_TO', 'STRING']
propertyTags[0x75] = ['RECEIVED_BY_ADDRTYPE', 'STRING']
propertyTags[0x76] = ['RECEIVED_BY_EMAIL_ADDRESS', 'STRING']
propertyTags[0x77] = ['RCVD_REPRESENTING_ADDRTYPE', 'STRING']
propertyTags[0x78] = ['RCVD_REPRESENTING_EMAIL_ADDRESS', 'STRING']
propertyTags[0x79] = ['ORIGINAL_AUTHOR_ADDRTYPE', 'STRING']
propertyTags[0x7a] = ['ORIGINAL_AUTHOR_EMAIL_ADDRESS', 'STRING']
propertyTags[0x7b] = ['ORIGINALLY_INTENDED_RECIP_ADDRTYPE', 'STRING']
propertyTags[0x7c] = ['ORIGINALLY_INTENDED_RECIP_EMAIL_ADDRESS', 'STRING']
propertyTags[0x7d] = ['TRANSPORT_MESSAGE_HEADERS', 'STRING']
propertyTags[0x7e] = ['DELEGATION', 'BINARY']
propertyTags[0x7f] = ['TNEF_CORRELATION_KEY', 'BINARY']
propertyTags[0x1000] = ['BODY', 'STRING']
propertyTags[0x1001] = ['REPORT_TEXT', 'STRING']
propertyTags[0x1002] = ['ORIGINATOR_AND_DL_EXPANSION_HISTORY', 'BINARY']
propertyTags[0x1003] = ['REPORTING_DL_NAME', 'BINARY']
propertyTags[0x1004] = ['REPORTING_MTA_CERTIFICATE', 'BINARY']
propertyTags[0x1006] = ['RTF_SYNC_BODY_CRC', 'I4']
propertyTags[0x1007] = ['RTF_SYNC_BODY_COUNT', 'I4']
propertyTags[0x1008] = ['RTF_SYNC_BODY_TAG', 'STRING']
propertyTags[0x1009] = ['RTF_COMPRESSED', 'BINARY']
propertyTags[0x1010] = ['RTF_SYNC_PREFIX_COUNT', 'I4']
propertyTags[0x1011] = ['RTF_SYNC_TRAILING_COUNT', 'I4']
propertyTags[0x1012] = ['ORIGINALLY_INTENDED_RECIP_ENTRYID', 'BINARY']
propertyTags[0x0c00] = ['CONTENT_INTEGRITY_CHECK', 'BINARY']
propertyTags[0x0c01] = ['EXPLICIT_CONVERSION', 'I4']
propertyTags[0x0c02] = ['IPM_RETURN_REQUESTED', 'BOOLEAN']
propertyTags[0x0c03] = ['MESSAGE_TOKEN', 'BINARY']
propertyTags[0x0c04] = ['NDR_REASON_CODE', 'I4']
propertyTags[0x0c05] = ['NDR_DIAG_CODE', 'I4']
propertyTags[0x0c06] = ['NON_RECEIPT_NOTIFICATION_REQUESTED', 'BOOLEAN']
propertyTags[0x0c07] = ['DELIVERY_POINT', 'I4']
propertyTags[0x0c08] = ['ORIGINATOR_NON_DELIVERY_REPORT_REQUESTED', 'BOOLEAN']
propertyTags[0x0c09] = ['ORIGINATOR_REQUESTED_ALTERNATE_RECIPIENT', 'BINARY']
propertyTags[0x0c0a] = ['PHYSICAL_DELIVERY_BUREAU_FAX_DELIVERY', 'BOOLEAN']
propertyTags[0x0c0b] = ['PHYSICAL_DELIVERY_MODE', 'I4']
propertyTags[0x0c0c] = ['PHYSICAL_DELIVERY_REPORT_REQUEST', 'I4']
propertyTags[0x0c0d] = ['PHYSICAL_FORWARDING_ADDRESS', 'BINARY']
propertyTags[0x0c0e] = ['PHYSICAL_FORWARDING_ADDRESS_REQUESTED', 'BOOLEAN']
propertyTags[0x0c0f] = ['PHYSICAL_FORWARDING_PROHIBITED', 'BOOLEAN']
propertyTags[0x0c10] = ['PHYSICAL_RENDITION_ATTRIBUTES', 'BINARY']
propertyTags[0x0c11] = ['PROOF_OF_DELIVERY', 'BINARY']
propertyTags[0x0c12] = ['PROOF_OF_DELIVERY_REQUESTED', 'BOOLEAN']
propertyTags[0x0c13] = ['RECIPIENT_CERTIFICATE', 'BINARY']
propertyTags[0x0c14] = ['RECIPIENT_NUMBER_FOR_ADVICE', 'STRING']
propertyTags[0x0c15] = ['RECIPIENT_TYPE', 'I4']
propertyTags[0x0c16] = ['REGISTERED_MAIL_TYPE', 'I4']
propertyTags[0x0c17] = ['REPLY_REQUESTED', 'BOOLEAN']
propertyTags[0x0c18] = ['REQUESTED_DELIVERY_METHOD', 'I4']
propertyTags[0x0c19] = ['SENDER_ENTRYID', 'BINARY']
propertyTags[0x0c1a] = ['SENDER_NAME', 'STRING']
propertyTags[0x0c1b] = ['SUPPLEMENTARY_INFO', 'STRING']
propertyTags[0x0c1c] = ['TYPE_OF_MTS_USER', 'I4']
propertyTags[0x0c1d] = ['SENDER_SEARCH_KEY', 'BINARY']
propertyTags[0x0c1e] = ['SENDER_ADDRTYPE', 'STRING']
propertyTags[0x0c1f] = ['SENDER_EMAIL_ADDRESS', 'STRING']
propertyTags[0x0e00] = ['CURRENT_VERSION', 'I8']
propertyTags[0x0e01] = ['DELETE_AFTER_SUBMIT', 'BOOLEAN']
propertyTags[0x0e02] = ['DISPLAY_BCC', 'STRING']
propertyTags[0x0e03] = ['DISPLAY_CC', 'STRING']
propertyTags[0x0e04] = ['DISPLAY_TO', 'STRING']
propertyTags[0x0e05] = ['PARENT_DISPLAY', 'STRING']
propertyTags[0x0e06] = ['MESSAGE_DELIVERY_TIME', 'SYSTIME']
propertyTags[0x0e07] = ['MESSAGE_FLAGS', 'I4']
propertyTags[0x0e08] = ['MESSAGE_SIZE', 'I4']
propertyTags[0x0e09] = ['PARENT_ENTRYID', 'BINARY']
propertyTags[0x0e0a] = ['SENTMAIL_ENTRYID', 'BINARY']
propertyTags[0x0e0c] = ['CORRELATE', 'BOOLEAN']
propertyTags[0x0e0d] = ['CORRELATE_MTSID', 'BINARY']
propertyTags[0x0e0e] = ['DISCRETE_VALUES', 'BOOLEAN']
propertyTags[0x0e0f] = ['RESPONSIBILITY', 'BOOLEAN']
propertyTags[0x0e10] = ['SPOOLER_STATUS', 'I4']
propertyTags[0x0e11] = ['TRANSPORT_STATUS', 'I4']
propertyTags[0x0e12] = ['MESSAGE_RECIPIENTS', 'OBJECT']
propertyTags[0x0e13] = ['MESSAGE_ATTACHMENTS', 'OBJECT']
propertyTags[0x0e14] = ['SUBMIT_FLAGS', 'I4']
propertyTags[0x0e15] = ['RECIPIENT_STATUS', 'I4']
propertyTags[0x0e16] = ['TRANSPORT_KEY', 'I4']
propertyTags[0x0e17] = ['MSG_STATUS', 'I4']
propertyTags[0x0e18] = ['MESSAGE_DOWNLOAD_TIME', 'I4']
propertyTags[0x0e19] = ['CREATION_VERSION', 'I8']
propertyTags[0x0e1a] = ['MODIFY_VERSION', 'I8']
propertyTags[0x0e1b] = ['HASATTACH', 'BOOLEAN']
propertyTags[0x0e1d] = ['NORMALIZED_SUBJECT', 'STRING']
propertyTags[0x0e1f] = ['RTF_IN_SYNC', 'BOOLEAN']
propertyTags[0x0e20] = ['ATTACH_SIZE', 'I4']
propertyTags[0x0e21] = ['ATTACH_NUM', 'I4']
propertyTags[0x0e22] = ['PREPROCESS', 'BOOLEAN']
propertyTags[0x0e25] = ['ORIGINATING_MTA_CERTIFICATE', 'BINARY']
propertyTags[0x0e26] = ['PROOF_OF_SUBMISSION', 'BINARY']
// A unique identifier for editing the properties of a MAPI object
propertyTags[0x0fff] = ['ENTRYID', 'BINARY']
// The type of an object
propertyTags[0x0ffe] = ['OBJECT_TYPE', 'I4']
propertyTags[0x0ffd] = ['ICON', 'BINARY']
propertyTags[0x0ffc] = ['MINI_ICON', 'BINARY']
propertyTags[0x0ffb] = ['STORE_ENTRYID', 'BINARY']
propertyTags[0x0ffa] = ['STORE_RECORD_KEY', 'BINARY']
// Binary identifer for an individual object
propertyTags[0x0ff9] = ['RECORD_KEY', 'BINARY']
propertyTags[0x0ff8] = ['MAPPING_SIGNATURE', 'BINARY']
propertyTags[0x0ff7] = ['ACCESS_LEVEL', 'I4']
// The primary key of a column in a table
propertyTags[0x0ff6] = ['INSTANCE_KEY', 'BINARY']
propertyTags[0x0ff5] = ['ROW_TYPE', 'I4']
propertyTags[0x0ff4] = ['ACCESS', 'I4']
propertyTags[0x3000] = ['ROWID', 'I4']
// The name to display for a given MAPI object
propertyTags[0x3001] = ['DISPLAY_NAME', 'STRING']
propertyTags[0x3002] = ['ADDRTYPE', 'STRING']
// An email address
propertyTags[0x3003] = ['EMAIL_ADDRESS', 'STRING']
// A comment field
propertyTags[0x3004] = ['COMMENT', 'STRING']
propertyTags[0x3005] = ['DEPTH', 'I4']
// Provider-defined display name for a service provider
propertyTags[0x3006] = ['PROVIDER_DISPLAY', 'STRING']
// The time an object was created
propertyTags[0x3007] = ['CREATION_TIME', 'SYSTIME']
// The time an object was last modified
propertyTags[0x3008] = ['LAST_MODIFICATION_TIME', 'SYSTIME']
// Flags describing a service provider, message service, or status object
propertyTags[0x3009] = ['RESOURCE_FLAGS', 'I4']
// The name of a provider dll, minus any "32" suffix and ".dll"
propertyTags[0x300a] = ['PROVIDER_DLL_NAME', 'STRING']
propertyTags[0x300b] = ['SEARCH_KEY', 'BINARY']
propertyTags[0x300c] = ['PROVIDER_UID', 'BINARY']
propertyTags[0x300d] = ['PROVIDER_ORDINAL', 'I4']
propertyTags[0x3301] = ['FORM_VERSION', 'STRING']
propertyTags[0x3302] = ['FORM_CLSID', 'CLSID']
propertyTags[0x3303] = ['FORM_CONTACT_NAME', 'STRING']
propertyTags[0x3304] = ['FORM_CATEGORY', 'STRING']
propertyTags[0x3305] = ['FORM_CATEGORY_SUB', 'STRING']
propertyTags[0x3306] = ['FORM_HOST_MAP', 'MV_LONG']
propertyTags[0x3307] = ['FORM_HIDDEN', 'BOOLEAN']
propertyTags[0x3308] = ['FORM_DESIGNER_NAME', 'STRING']
propertyTags[0x3309] = ['FORM_DESIGNER_GUID', 'CLSID']
propertyTags[0x330a] = ['FORM_MESSAGE_BEHAVIOR', 'I4']
// Is this row the default message store?
propertyTags[0x3400] = ['DEFAULT_STORE', 'BOOLEAN']
propertyTags[0x340d] = ['STORE_SUPPORT_MASK', 'I4']
propertyTags[0x340e] = ['STORE_STATE', 'I4']
propertyTags[0x3410] = ['IPM_SUBTREE_SEARCH_KEY', 'BINARY']
propertyTags[0x3411] = ['IPM_OUTBOX_SEARCH_KEY', 'BINARY']
propertyTags[0x3412] = ['IPM_WASTEBASKET_SEARCH_KEY', 'BINARY']
propertyTags[0x3413] = ['IPM_SENTMAIL_SEARCH_KEY', 'BINARY']
// Provder-defined message store type
propertyTags[0x3414] = ['MDB_PROVIDER', 'BINARY']
propertyTags[0x3415] = ['RECEIVE_FOLDER_SETTINGS', 'OBJECT']
propertyTags[0x35df] = ['VALID_FOLDER_MASK', 'I4']
propertyTags[0x35e0] = ['IPM_SUBTREE_ENTRYID', 'BINARY']
propertyTags[0x35e2] = ['IPM_OUTBOX_ENTRYID', 'BINARY']
propertyTags[0x35e3] = ['IPM_WASTEBASKET_ENTRYID', 'BINARY']
propertyTags[0x35e4] = ['IPM_SENTMAIL_ENTRYID', 'BINARY']
propertyTags[0x35e5] = ['VIEWS_ENTRYID', 'BINARY']
propertyTags[0x35e6] = ['COMMON_VIEWS_ENTRYID', 'BINARY']
propertyTags[0x35e7] = ['FINDER_ENTRYID', 'BINARY']
propertyTags[0x3600] = ['CONTAINER_FLAGS', 'I4']
propertyTags[0x3601] = ['FOLDER_TYPE', 'I4']
propertyTags[0x3602] = ['CONTENT_COUNT', 'I4']
propertyTags[0x3603] = ['CONTENT_UNREAD', 'I4']
propertyTags[0x3604] = ['CREATE_TEMPLATES', 'OBJECT']
propertyTags[0x3605] = ['DETAILS_TABLE', 'OBJECT']
propertyTags[0x3607] = ['SEARCH', 'OBJECT']
propertyTags[0x3609] = ['SELECTABLE', 'BOOLEAN']
propertyTags[0x360a] = ['SUBFOLDERS', 'BOOLEAN']
propertyTags[0x360b] = ['STATUS', 'I4']
propertyTags[0x360c] = ['ANR', 'STRING']
propertyTags[0x360d] = ['CONTENTS_SORT_ORDER', 'MV_LONG']
propertyTags[0x360e] = ['CONTAINER_HIERARCHY', 'OBJECT']
propertyTags[0x360f] = ['CONTAINER_CONTENTS', 'OBJECT']
propertyTags[0x3610] = ['FOLDER_ASSOCIATED_CONTENTS', 'OBJECT']
propertyTags[0x3611] = ['DEF_CREATE_DL', 'BINARY']
propertyTags[0x3612] = ['DEF_CREATE_MAILUSER', 'BINARY']
propertyTags[0x3613] = ['CONTAINER_CLASS', 'STRING']
propertyTags[0x3614] = ['CONTAINER_MODIFY_VERSION', 'I8']
propertyTags[0x3615] = ['AB_PROVIDER_ID', 'BINARY']
propertyTags[0x3616] = ['DEFAULT_VIEW_ENTRYID', 'BINARY']
propertyTags[0x3617] = ['ASSOC_CONTENT_COUNT', 'I4']
propertyTags[0x3700] = ['ATTACHMENT_X400_PARAMETERS', 'BINARY']
propertyTags[0x3701] = ['ATTACH_DATA_OBJ', 'OBJECT']
propertyTags[0x3701] = ['ATTACH_DATA_BIN', 'BINARY']
propertyTags[0x3702] = ['ATTACH_ENCODING', 'BINARY']
propertyTags[0x3703] = ['ATTACH_EXTENSION', 'STRING']
propertyTags[0x3704] = ['ATTACH_FILENAME', 'STRING']
propertyTags[0x3705] = ['ATTACH_METHOD', 'I4']
propertyTags[0x3707] = ['ATTACH_LONG_FILENAME', 'STRING']
propertyTags[0x3708] = ['ATTACH_PATHNAME', 'STRING']
propertyTags[0x370a] = ['ATTACH_TAG', 'BINARY']
propertyTags[0x370b] = ['RENDERING_POSITION', 'I4']
propertyTags[0x370c] = ['ATTACH_TRANSPORT_NAME', 'STRING']
propertyTags[0x370d] = ['ATTACH_LONG_PATHNAME', 'STRING']
propertyTags[0x370e] = ['ATTACH_MIME_TAG', 'STRING']
propertyTags[0x370f] = ['ATTACH_ADDITIONAL_INFO', 'BINARY']
propertyTags[0x3900] = ['DISPLAY_TYPE', 'I4']
propertyTags[0x3902] = ['TEMPLATEID', 'BINARY']
propertyTags[0x3904] = ['PRIMARY_CAPABILITY', 'BINARY']
propertyTags[0x39ff] = ['7BIT_DISPLAY_NAME', 'STRING']
propertyTags[0x3a00] = ['ACCOUNT', 'STRING']
propertyTags[0x3a01] = ['ALTERNATE_RECIPIENT', 'BINARY']
propertyTags[0x3a02] = ['CALLBACK_TELEPHONE_NUMBER', 'STRING']
propertyTags[0x3a03] = ['CONVERSION_PROHIBITED', 'BOOLEAN']
propertyTags[0x3a04] = ['DISCLOSE_RECIPIENTS', 'BOOLEAN']
propertyTags[0x3a05] = ['GENERATION', 'STRING']
propertyTags[0x3a06] = ['GIVEN_NAME', 'STRING']
propertyTags[0x3a07] = ['GOVERNMENT_ID_NUMBER', 'STRING']
propertyTags[0x3a08] = ['BUSINESS_TELEPHONE_NUMBER', 'STRING']
propertyTags[0x3a09] = ['HOME_TELEPHONE_NUMBER', 'STRING']
propertyTags[0x3a0a] = ['INITIALS', 'STRING']
propertyTags[0x3a0b] = ['KEYWORD', 'STRING']
propertyTags[0x3a0c] = ['LANGUAGE', 'STRING']
propertyTags[0x3a0d] = ['LOCATION', 'STRING']
propertyTags[0x3a0e] = ['MAIL_PERMISSION', 'BOOLEAN']
propertyTags[0x3a0f] = ['MHS_COMMON_NAME', 'STRING']
propertyTags[0x3a10] = ['ORGANIZATIONAL_ID_NUMBER', 'STRING']
propertyTags[0x3a11] = ['SURNAME', 'STRING']
propertyTags[0x3a12] = ['ORIGINAL_ENTRYID', 'BINARY']
propertyTags[0x3a13] = ['ORIGINAL_DISPLAY_NAME', 'STRING']
propertyTags[0x3a14] = ['ORIGINAL_SEARCH_KEY', 'BINARY']
propertyTags[0x3a15] = ['POSTAL_ADDRESS', 'STRING']
propertyTags[0x3a16] = ['COMPANY_NAME', 'STRING']
propertyTags[0x3a17] = ['TITLE', 'STRING']
propertyTags[0x3a18] = ['DEPARTMENT_NAME', 'STRING']
propertyTags[0x3a19] = ['OFFICE_LOCATION', 'STRING']
propertyTags[0x3a1a] = ['PRIMARY_TELEPHONE_NUMBER', 'STRING']
propertyTags[0x3a1b] = ['BUSINESS2_TELEPHONE_NUMBER', 'STRING']
propertyTags[0x3a1c] = ['MOBILE_TELEPHONE_NUMBER', 'STRING']
propertyTags[0x3a1d] = ['RADIO_TELEPHONE_NUMBER', 'STRING']
propertyTags[0x3a1e] = ['CAR_TELEPHONE_NUMBER', 'STRING']
propertyTags[0x3a1f] = ['OTHER_TELEPHONE_NUMBER', 'STRING']
propertyTags[0x3a20] = ['TRANSMITABLE_DISPLAY_NAME', 'STRING']
propertyTags[0x3a21] = ['PAGER_TELEPHONE_NUMBER', 'STRING']
propertyTags[0x3a22] = ['USER_CERTIFICATE', 'BINARY']
propertyTags[0x3a23] = ['PRIMARY_FAX_NUMBER', 'STRING']
propertyTags[0x3a24] = ['BUSINESS_FAX_NUMBER', 'STRING']
propertyTags[0x3a25] = ['HOME_FAX_NUMBER', 'STRING']
propertyTags[0x3a26] = ['COUNTRY', 'STRING']
propertyTags[0x3a27] = ['LOCALITY', 'STRING']
propertyTags[0x3a28] = ['STATE_OR_PROVINCE', 'STRING']
propertyTags[0x3a29] = ['STREET_ADDRESS', 'STRING']
propertyTags[0x3a2a] = ['POSTAL_CODE', 'STRING']
propertyTags[0x3a2b] = ['POST_OFFICE_BOX', 'STRING']
propertyTags[0x3a2c] = ['TELEX_NUMBER', 'STRING']
propertyTags[0x3a2d] = ['ISDN_NUMBER', 'STRING']
propertyTags[0x3a2e] = ['ASSISTANT_TELEPHONE_NUMBER', 'STRING']
propertyTags[0x3a2f] = ['HOME2_TELEPHONE_NUMBER', 'STRING']
propertyTags[0x3a30] = ['ASSISTANT', 'STRING']
propertyTags[0x3a40] = ['SEND_RICH_INFO', 'BOOLEAN']
propertyTags[0x3a41] = ['WEDDING_ANNIVERSARY', 'SYSTIME']
propertyTags[0x3a42] = ['BIRTHDAY', 'SYSTIME']
propertyTags[0x3a43] = ['HOBBIES', 'STRING']
propertyTags[0x3a44] = ['MIDDLE_NAME', 'STRING']
propertyTags[0x3a45] = ['DISPLAY_NAME_PREFIX', 'STRING']
propertyTags[0x3a46] = ['PROFESSION', 'STRING']
propertyTags[0x3a47] = ['PREFERRED_BY_NAME', 'STRING']
propertyTags[0x3a48] = ['SPOUSE_NAME', 'STRING']
propertyTags[0x3a49] = ['COMPUTER_NETWORK_NAME', 'STRING']
propertyTags[0x3a4a] = ['CUSTOMER_ID', 'STRING']
propertyTags[0x3a4b] = ['TTYTDD_PHONE_NUMBER', 'STRING']
propertyTags[0x3a4c] = ['FTP_SITE', 'STRING']
propertyTags[0x3a4d] = ['GENDER', 'I2']
propertyTags[0x3a4e] = ['MANAGER_NAME', 'STRING']
propertyTags[0x3a4f] = ['NICKNAME', 'STRING']
propertyTags[0x3a50] = ['PERSONAL_HOME_PAGE', 'STRING']
propertyTags[0x3a51] = ['BUSINESS_HOME_PAGE', 'STRING']
propertyTags[0x3a52] = ['CONTACT_VERSION', 'CLSID']
propertyTags[0x3a53] = ['CONTACT_ENTRYIDS', 'MV_BINARY']
propertyTags[0x3a54] = ['CONTACT_ADDRTYPES', 'MV_STRING']
propertyTags[0x3a55] = ['CONTACT_DEFAULT_ADDRESS_INDEX', 'I4']
propertyTags[0x3a56] = ['CONTACT_EMAIL_ADDRESSES', 'MV_STRING']
propertyTags[0x3a57] = ['COMPANY_MAIN_PHONE_NUMBER', 'STRING']
propertyTags[0x3a58] = ['CHILDRENS_NAMES', 'MV_STRING']
propertyTags[0x3a59] = ['HOME_ADDRESS_CITY', 'STRING']
propertyTags[0x3a5a] = ['HOME_ADDRESS_COUNTRY', 'STRING']
propertyTags[0x3a5b] = ['HOME_ADDRESS_POSTAL_CODE', 'STRING']
propertyTags[0x3a5c] = ['HOME_ADDRESS_STATE_OR_PROVINCE', 'STRING']
propertyTags[0x3a5d] = ['HOME_ADDRESS_STREET', 'STRING']
propertyTags[0x3a5e] = ['HOME_ADDRESS_POST_OFFICE_BOX', 'STRING']
propertyTags[0x3a5f] = ['OTHER_ADDRESS_CITY', 'STRING']
propertyTags[0x3a60] = ['OTHER_ADDRESS_COUNTRY', 'STRING']
propertyTags[0x3a61] = ['OTHER_ADDRESS_POSTAL_CODE', 'STRING']
propertyTags[0x3a62] = ['OTHER_ADDRESS_STATE_OR_PROVINCE', 'STRING']
propertyTags[0x3a63] = ['OTHER_ADDRESS_STREET', 'STRING']
propertyTags[0x3a64] = ['OTHER_ADDRESS_POST_OFFICE_BOX', 'STRING']
propertyTags[0x3d00] = ['STORE_PROVIDERS', 'BINARY']
propertyTags[0x3d01] = ['AB_PROVIDERS', 'BINARY']
propertyTags[0x3d02] = ['TRANSPORT_PROVIDERS', 'BINARY']
propertyTags[0x3d04] = ['DEFAULT_PROFILE', 'BOOLEAN']
propertyTags[0x3d05] = ['AB_SEARCH_PATH', 'MV_BINARY']
propertyTags[0x3d06] = ['AB_DEFAULT_DIR', 'BINARY']
propertyTags[0x3d07] = ['AB_DEFAULT_PAB', 'BINARY']
propertyTags[0x3d09] = ['SERVICE_NAME', 'STRING']
propertyTags[0x3d0a] = ['SERVICE_DLL_NAME', 'STRING']
propertyTags[0x3d0b] = ['SERVICE_entryName', 'STRING']
propertyTags[0x3d0c] = ['SERVICE_UID', 'BINARY']
propertyTags[0x3d0d] = ['SERVICE_EXTRA_UIDS', 'BINARY']
propertyTags[0x3d0e] = ['SERVICES', 'BINARY']
propertyTags[0x3d0f] = ['SERVICE_SUPPORT_FILES', 'MV_STRING']
propertyTags[0x3d10] = ['SERVICE_DELETE_FILES', 'MV_STRING']
propertyTags[0x3d11] = ['AB_SEARCH_PATH_UPDATE', 'BINARY']
propertyTags[0x3d12] = ['PROFILE_NAME', 'STRING']
propertyTags[0x3e00] = ['IDENTITY_DISPLAY', 'STRING']
propertyTags[0x3e01] = ['IDENTITY_ENTRYID', 'BINARY']
propertyTags[0x3e02] = ['RESOURCE_METHODS', 'I4']
// Service provider type
propertyTags[0x3e03] = ['RESOURCE_TYPE', 'I4']
propertyTags[0x3e04] = ['STATUS_CODE', 'I4']
propertyTags[0x3e05] = ['IDENTITY_SEARCH_KEY', 'BINARY']
propertyTags[0x3e06] = ['OWN_STORE_ENTRYID', 'BINARY']
propertyTags[0x3e07] = ['RESOURCE_PATH', 'STRING']
propertyTags[0x3e08] = ['STATUS_STRING', 'STRING']
propertyTags[0x3e09] = ['X400_DEFERRED_DELIVERY_CANCEL', 'BOOLEAN']
propertyTags[0x3e0a] = ['HEADER_FOLDER_ENTRYID', 'BINARY']
propertyTags[0x3e0b] = ['REMOTE_PROGRESS', 'I4']
propertyTags[0x3e0c] = ['REMOTE_PROGRESS_TEXT', 'STRING']
propertyTags[0x3e0d] = ['REMOTE_VALIDATE_OK', 'BOOLEAN']
propertyTags[0x3f00] = ['CONTROL_FLAGS', 'I4']
propertyTags[0x3f01] = ['CONTROL_STRUCTURE', 'BINARY']
propertyTags[0x3f02] = ['CONTROL_TYPE', 'I4']
propertyTags[0x3f03] = ['DELTAX', 'I4']
propertyTags[0x3f04] = ['DELTAY', 'I4']
propertyTags[0x3f05] = ['XPOS', 'I4']
propertyTags[0x3f06] = ['YPOS', 'I4']
propertyTags[0x3f07] = ['CONTROL_ID', 'BINARY']
propertyTags[0x3f08] = ['INITIAL_DETAILS_PANE', 'I4']

abstract class FixedLengthValueLoader {
  fixedLength = ''
  abstract load(value: any): any
}

abstract class VariableLengthValueLoader {
  variableLength = ''
  abstract load(value: any): any
}

class NULL extends FixedLengthValueLoader {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  load(value: any): any {
    // value is an eight-byte long bytestring with unused content.
    return null
  }
}

class BOOLEAN extends FixedLengthValueLoader {
  load(value: any): any {
    // value is an eight-byte long bytestring holding a two-byte integer.
    return value[0] === 1
  }
}

class INTEGER16 extends FixedLengthValueLoader {
  load(value: any): any {
    // value is an eight-byte long bytestring holding a two-byte integer.
    return value
      .slice(0, 2)
      .reverse()
      .reduce((a: any, b: any) => (a << 8) + b)
  }
}

class INTEGER32 extends FixedLengthValueLoader {
  load(value: any): any {
    // value is an eight-byte long bytestring holding a four-byte integer.
    return value
      .slice(0, 4)
      .reverse()
      .reduce((a: any, b: any) => (a << 8) + b)
  }
}

class INTEGER64 extends FixedLengthValueLoader {
  load(value: any): any {
    // value is an eight-byte long bytestring holding an eight-byte integer.
    return value
      .slice()
      .reverse()
      .reduce((a: any, b: any) => bigInt(a).shiftLeft(8).add(bigInt(b)))
  }
}

class INTTIME extends FixedLengthValueLoader {
  load(value: any): any {
    // value is an eight-byte long bytestring encoding the integer number of
    // 100-nanosecond intervals since January 1, 1601.
    //
    // Use bigint due to number type being too small to fit a 64-bit integer
    const delta: any = value
      .slice()
      .reverse()
      .reduce((a: any, b: any) => bigInt(a).shiftLeft(8).add(bigInt(b)))
    return new Date(
      new Date('1601-01-01T00:00:00Z').getTime() + Number(delta.divide(10000))
    )
  }
}

class BINARY extends VariableLengthValueLoader {
  load(value: any): any {
    return value
  }
}

class STRING8 extends VariableLengthValueLoader {
  load(value: any): any {
    return new TextDecoder('utf-8').decode(new Uint8Array(value || []))
  }
}

class UNICODE extends VariableLengthValueLoader {
  load(value: any): any {
    return new TextDecoder('utf-16le').decode(new Uint8Array(value || []))
  }
}

class EMBEDDED_MESSAGE {
  async load(cfb: any, entryName: string) {
    return await loadMessageStream(cfb, entryName, false)
  }
}

const propertyTypes = new Array(0x102 + 1)
propertyTypes[0x1] = new NULL()
propertyTypes[0x2] = new INTEGER16()
propertyTypes[0x3] = new INTEGER32()
propertyTypes[0x4] = 'FLOAT'
propertyTypes[0x5] = 'DOUBLE'
propertyTypes[0x6] = 'CURRENCY'
propertyTypes[0x7] = 'APPTIME'
propertyTypes[0xa] = 'ERROR'
propertyTypes[0xb] = new BOOLEAN()
propertyTypes[0xd] = new EMBEDDED_MESSAGE()
propertyTypes[0x14] = new INTEGER64()
propertyTypes[0x1e] = new STRING8()
propertyTypes[0x1f] = new UNICODE()
propertyTypes[0x40] = new INTTIME()
propertyTypes[0x48] = 'CLSID'
propertyTypes[0xfb] = 'SVREID'
propertyTypes[0xfd] = 'SRESTRICT'
propertyTypes[0xfe] = 'ACTIONS'
propertyTypes[0x102] = new BINARY()

const parseProperties = async (
  cfb: any,
  entryName: string,
  isTopLevel: boolean
) => {
  // Load stream content
  const entry = CFB.find(cfb, entryName)
  if (entry == null) {
    return {}
  }

  // Skip header.
  let i = isTopLevel ? 32 : 24

  // Read 16-byte entries.
  const ret: any = {}
  while (i < entry.size) {
    // Read the entry
    const propertyType = entry.content.slice(i + 0, i + 2)
    const propertyTag = entry.content.slice(i + 2, i + 4)
    // const flags = entry.content.slice(i + 4, i + 8)
    let value: Uint8Array | number[] | CFB.CFB$Entry = entry.content.slice(
      i + 8,
      i + 16
    )

    i += 16

    // Turn the byte strings into numbers and look up the property type
    const _propertyType = propertyType[0] + (propertyType[1] << 8)
    const _propertyTag = propertyTag[0] + (propertyTag[1] << 8)
    if (_propertyTag > propertyTags.length || !propertyTags[_propertyTag])
      continue
    const tagName = propertyTags[_propertyTag][0]
    const tagType = propertyTypes[_propertyType]

    if (tagType instanceof FixedLengthValueLoader) {
      ret[tagName] = (<FixedLengthValueLoader>tagType).load(value)
    } else if (tagType instanceof VariableLengthValueLoader) {
      // Look up the stream in the document that holds the value.
      let streamName =
        '__substg1.0_' +
        (<string>_propertyTag.toString(16)).toUpperCase().padStart(4, '0') +
        (<string>_propertyType.toString(16)).toUpperCase().padStart(4, '0')
      streamName =
        entryName.substring(0, entryName.lastIndexOf('/')) + '/' + streamName
      const foo = CFB.find(cfb, streamName)
      if (!foo) return
      value = foo
      if (!value) continue
      ret[tagName] = (<VariableLengthValueLoader>tagType).load(value.content)
    } else if (tagType instanceof EMBEDDED_MESSAGE) {
      // Look up the stream in the document that holds the value.
      let streamName =
        '__substg1.0_' +
        (<string>_propertyTag.toString(16)).toUpperCase().padStart(4, '0') +
        (<string>_propertyType.toString(16)).toUpperCase().padStart(4, '0')
      streamName =
        entryName.substring(0, entryName.lastIndexOf('/')) + '/' + streamName
      value = (await (<EMBEDDED_MESSAGE>tagType).load(
        cfb,
        streamName
      )) as unknown as Uint8Array | CFB.CFB$Entry | number[]
      ret[tagName] = value
    }
  }

  return ret
}

const processAttachment = async (cfb: any, entryName: string, msg: any) => {
  // Load attachment stream
  const props = await parseProperties(
    cfb,
    entryName + '/__properties_version1.0',
    false
  )

  // The attachment content
  const blob = props.ATTACH_DATA_BIN

  if (!blob) {
    return
  }

  // Get the filename and mime type
  let filename = props.ATTACH_LONG_FILENAME || props.ATTACH_FILENAME

  // Determine the correct filename for embedded e-mails
  if (!filename) {
    // Handle clear signed email
    if (
      'ATTACH_MIME_TAG' in props &&
      props.ATTACH_MIME_TAG === 'multipart/signed'
    ) {
      // Decode the S/MIME message
      const content = new TextDecoder('utf-8').decode(Buffer.from(blob))

      // Empty out the body of the email if there is a body inside the signed email
      if (/^Content-Type: text\/(html|plain)/gm.test(content)) {
        // Put a placeholder that will be replaced later
        msg.html = null
        msg.text = '__msg2eml_signed_email__'
        msg.signed_content = content
        return
      }
    } else if (
      'ATTACH_MIME_TAG' in props &&
      props.ATTACH_MIME_TAG === 'message/rfc822'
    ) {
      if ('DISPLAY_NAME' in props && props.DISPLAY_NAME) {
        filename = props.DISPLAY_NAME.replace(/[/\\?%*:|"<>]/g, '-') + '.eml'
      } else {
        cfb.unknown_attachment_count = cfb.unknown_attachment_count || 0
        cfb.unknown_attachment_count++
        filename = 'unknown_' + cfb.unknown_attachment_count + '.eml'
      }
      props.ATTACH_MIME_TAG = 'message/rfc822'
    } else {
      cfb.unknown_attachment_count = cfb.unknown_attachment_count || 0
      cfb.unknown_attachment_count++
      filename = 'unknown_' + cfb.unknown_attachment_count + '.dat'
    }
  }
  // Voor Mime type van een bestand wordt naar de extensie gekeken
  filename = filename.split('/').slice(-1)[0].split('\\').slice(-1)[0]
  const mimeType = props.ATTACH_MIME_TAG || mime.lookup(filename) || 'application/octet-stream'
  if (Buffer.isBuffer(blob)) {
    msg.attachments.push({
      name: filename,
      contentType: mimeType,
      data: Buffer.from(blob),
    })
  }
}

const loadMessageStream = async (
  cfb: any,
  entryName: string,
  isTopLevel: boolean
) => {
  // Load stream data
  const props = await parseProperties(
    cfb,
    entryName + '/__properties_version1.0',
    isTopLevel
  )

  // Construct the MIME message
  const msg: any = {}

  // Add the raw headers, if known.
  const headersObj: any = {}
  if (Object.keys(headersObj).length === 0) {
    // Construct common headers from metadata.

    // Tijd
    if ('MESSAGE_DELIVERY_TIME' in props) {
      headersObj.date = props.MESSAGE_DELIVERY_TIME
    }

    // Verstuurd door naam
    if ('SENDER_NAME' in props && props.SENDER_NAME) {
      if (
        'SENT_REPRESENTING_NAME' in props &&
        props.SENT_REPRESENTING_NAME &&
        props.SENDER_NAME !== props.SENT_REPRESENTING_NAME
      ) {
        props.SENDER_NAME =
          props.SENDER_NAME + ' (' + props.SENT_REPRESENTING_NAME + ')'
      }
      headersObj.from = props.SENDER_NAME
    }

    // Verstuurd door email-adres
    if ('SENDER_EMAIL_ADDRESS' in props && props.SENDER_EMAIL_ADDRESS) {
      // @TODO maak hier een functie van en controleer dit bij IEDER mailadres
      // Misschien trimmen omdat ie geen spaties/line breaks deugd
      const r = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/
      const validateMail = r.test(props.SENDER_EMAIL_ADDRESS)
      if (validateMail) {
        headersObj.from =
          (headersObj.from || '') + ' <' + props.SENDER_EMAIL_ADDRESS + '>'
      }
    }

    // Verstuurd aan
    if ('DISPLAY_TO' in props && props.DISPLAY_TO) {
      // eslint-disable-next-line no-control-regex
      headersObj.to = props.DISPLAY_TO.replace(/\x00$/, '')
    }

    // CC
    if ('DISPLAY_CC' in props && props.DISPLAY_CC) {
      // eslint-disable-next-line no-control-regex
      headersObj.cc = props.DISPLAY_CC.replace(/\x00$/, '')
    }

    // BCC
    if ('DISPLAY_BCC' in props && props.DISPLAY_BCC) {
      // eslint-disable-next-line no-control-regex
      headersObj.bcc = props.DISPLAY_BCC.replace(/\x00$/, '')
    }

    // Onderwerp
    if ('SUBJECT' in props && props.SUBJECT) {
      headersObj.subject = props.SUBJECT
    }
  }

  // Add the plain-text body from the BODY field.
  const attachmentRefs: any = {}
  if ('BODY' in props && !('RTF_COMPRESSED' in props)) {
    msg.text = props.BODY
  } else if ('RTF_COMPRESSED' in props) {
    // Decompress the RTF and then deencapsulate the RTF to obtain the original
    // HTML representation of the email
    const rtf = new Uint8Array(decompressRTF(props.RTF_COMPRESSED))

    // Check if the RTF actually contains HTML tags, otherwise use plaintext
    if (new TextDecoder('utf-8').decode(rtf).indexOf('\\*\\htmltag') >= 0) {
      const html: string = <string>(
        deEncapsulateSync(Buffer.from(rtf), { decode: iconvLite.decode }).text
      )

      // Add meta tag to specify encoding
      const newhtml = '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>' + html + '</body></html>';

      msg.html = newhtml

      // Detect all the inlined-attachments
      const r = /src="cid:(([^@]+)@[A-Z0-9]+\.[A-Z0-9]+)"/g

      let m
      while ((m = r.exec(html)) !== null) {
        attachmentRefs[m[2]] = m[1]
      }
    } else {
      msg.text = props.BODY
    }
  }

  msg.headers = headersObj

  // Copy all attachments
  msg.attachments = msg.attachments || []

  for (let i = 0; i < cfb.FullPaths.length; i++) {
    if (
      cfb.FullPaths[i].indexOf('/__attach_version1.0_#') >= 0 &&
      cfb.FullPaths[i].indexOf(entryName.replace(/\/$/g, '')) === 0 &&
      cfb.FullPaths[i].replace(/\/$/g, '') !== entryName.replace(/\/$/g, '') &&
      cfb.FullPaths[i].replace(/\/$/g, '').split('/').length ===
        entryName.replace(/\/$/g, '').split('/').length + 1
    ) {
      await processAttachment(
        cfb,
        (<string>cfb.FullPaths[i]).replace(/\/$/g, ''),
        msg
      )
    }
  }

  // // Fix inline-attachment references
  msg.attachments.forEach((a: any) => {
    if (a.name in attachmentRefs) {
      a.cid = attachmentRefs[a.name]
    }
  })

  msg.inlineAttachments = msg.attachments.filter((att: any) => att.cid)
  msg.attachments = msg.attachments.filter((att: any) => !att.cid)

  msg.attachments = msg.attachments.map((att: any) => {
    const { name, contentType, data } = att
    return {
      filename: name,
      contentType,
      content: data,
      size: data.length,
    }
  })

  msg.inlineAttachments = msg.inlineAttachments.map((att: any) => {
    const { name, contentType, data, cid } = att
    return {
      filename: name,
      contentType,
      content: data,
      size: data.length,
      cid
    }
  })

  return msg
}

export const prepareMsg = async (obj: Buffer) => {
  const result = CFB.parse(obj)
  return await loadMessageStream(result, 'Root Entry', true)
}

export const parseMsg = prepareMsg
