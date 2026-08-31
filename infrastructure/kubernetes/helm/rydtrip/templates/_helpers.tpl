{{/* Common labels applied to every resource this chart creates. */}}
{{- define "rydtrip.labels" -}}
app.kubernetes.io/part-of: rydtrip
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{/* hostAliases block built from the alias names listed in a service's values entry. */}}
{{- define "rydtrip.hostAliases" -}}
{{- $root := index . 0 -}}
{{- $aliases := index . 1 -}}
{{- if $aliases }}
hostAliases:
{{- if has "postgres" $aliases }}
  - ip: {{ $root.Values.composeNetwork.postgresIp | quote }}
    hostnames: ["postgres"]
{{- end }}
{{- if has "kafka" $aliases }}
  - ip: {{ $root.Values.composeNetwork.kafkaIp | quote }}
    hostnames: ["kafka"]
{{- end }}
{{- if has "redis" $aliases }}
  - ip: {{ $root.Values.composeNetwork.redisIp | quote }}
    hostnames: ["redis"]
{{- end }}
{{- end }}
{{- end -}}
