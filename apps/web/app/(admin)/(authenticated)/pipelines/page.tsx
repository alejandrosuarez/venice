'use client'

import {Copy, MoreHorizontal, Pencil, RefreshCcw, Trash} from 'lucide-react'
import React from 'react'

import {zId} from '@usevenice/cdk-core'
import type {RouterOutput} from '@usevenice/engine-backend'
import {trpcReact} from '@usevenice/engine-frontend'
import type {SchemaSheetRef, SchemaSheetRefValue} from '@usevenice/ui'
import {
  Button,
  DataTable,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  SchemaSheet,
  useToast,
} from '@usevenice/ui'
import {z} from '@usevenice/util'

export default function PipelinesPage() {
  const res = trpcReact.listPipelines2.useQuery()

  ;(globalThis as any).listPipelines2Res = res

  return (
    <div className="p-6">
      <header className="flex items-center">
        <h2 className="mb-4 mr-auto text-2xl font-semibold tracking-tight">
          Pipelines
        </h2>
        {/*
        Would be better if the button was more explicit...
        Should probably render sheets / dialogs etc. without trigger by default.
         */}
        <PipelineSheet />
      </header>
      <p>
        Pipelines connect resources together by syncing data from source
        resource to destination resoruce
      </p>
      <DataTable
        query={res}
        columns={[
          {
            id: 'actions',
            enableHiding: false,
            cell: ({row}) => <PipelineMenu pipeline={row.original} />,
          },
          {
            accessorKey: 'id',
            header: 'ID',
            cell: ({row}) => <pre>{row.getValue('id')}</pre>,
          },
          {
            accessorKey: 'sourceId',
            header: 'Source Id',
            cell: ({row}) => <pre>{row.getValue('sourceId')}</pre>,
          },
          {
            accessorKey: 'destinationId',
            header: 'Destination Id',
            cell: ({row}) => <pre>{row.getValue('destinationId')}</pre>,
          },
        ]}
      />
    </div>
  )
}

type Pipeline = RouterOutput['listPipelines2'][number]

function PipelineMenu({pipeline}: {pipeline: Pipeline}) {
  const ref = React.useRef<SchemaSheetRefValue>(null)
  const {toast} = useToast()
  const deletePipeline = trpcReact.deletePipeline.useMutation({
    onSuccess: () => {
      toast({
        title: 'Pipeline deleted',
        description: pipeline.id,
        variant: 'success',
      })
    },
    onError: (err) => {
      toast({
        title: 'Failed to delete pipeline',
        description: `${err.message} ${pipeline.id}`,
        variant: 'destructive',
      })
    },
  })
  const syncPipeline = trpcReact.syncPipeline.useMutation({
    onSuccess: () => {
      toast({
        title: 'Pipeline synced',
        description: pipeline.id,
        variant: 'success',
      })
    },
    onError: (err) => {
      toast({
        title: 'Failed to sync pipeline',
        description: `${err.message} ${pipeline.id}`,
        variant: 'destructive',
      })
    },
  })
  return (
    <DropdownMenu>
      <PipelineSheet ref={ref} pipeline={pipeline} triggerButton={false} />
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => navigator.clipboard.writeText(pipeline.id)}>
          <Copy className="mr-2 h-4 w-4" />
          <div>
            Copy Pipeline ID
            <br />
            <pre className="text-muted-foreground">{pipeline.id}</pre>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => syncPipeline.mutate([pipeline.id, {}])}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Sync pipeline
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => ref.current?.setOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit pipeline
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => deletePipeline.mutate({id: pipeline.id})}>
          <Trash className="mr-2 h-4 w-4" />
          Delete pipeline
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const PipelineSheet = React.forwardRef(function PipelineSheetButton(
  props: {pipeline?: Pipeline; triggerButton?: boolean},
  ref: SchemaSheetRef,
) {
  const resourcesRes = trpcReact.listResources.useQuery()

  const zResoId = z.union(
    (resourcesRes.data ?? []).map((r) =>
      z
        .literal(r.id)
        .describe(r.displayName ? `${r.displayName} <${r.id}>` : r.id),
    ) as [z.ZodLiteral<string>, z.ZodLiteral<string>],
  )
  // Filter for only sources vs destinations when saving...
  // This is where it would be a nice advantage to use something like an Airbyte
  // so we don't have to build the whole admin ui
  // But then that won't work if admin ui cannot be embedded
  const formSchema = z.object({
    ...(props.pipeline && ({id: zId('pipe')} as {})),
    sourceId: zResoId,
    destinationId: zResoId,
    sourceState: z.record(z.any()).optional(),
    destinationState: z.record(z.any()).optional(),
  })

  const upsertPipeline = trpcReact.adminUpsertPipeline.useMutation()
  return (
    <SchemaSheet
      ref={ref}
      triggerButton={props.triggerButton}
      title={props.pipeline ? 'Edit' : 'New Pipeline'}
      buttonProps={{variant: props.pipeline ? 'ghost' : 'default'}}
      formProps={{uiSchema: {id: {'ui:readonly': true}}}}
      schema={formSchema}
      mutation={upsertPipeline}
      initialValues={props.pipeline}
    />
  )
})
